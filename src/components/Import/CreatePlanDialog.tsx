import { Icon } from '@iconify/react';
import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useMemo, useState } from 'react';
import { getForkliftNamespace } from '../../index';
import { getProviderNamespaces, getProviderVMs, InventoryVM } from '../../utils/forkliftInventory';
import { safeError } from '../../utils/sanitize';
import { toYaml } from '../../utils/yamlSerialize';
import ForkliftNetworkMap from './ForkliftNetworkMap';
import ForkliftProvider, { PROVIDER_TYPE_META } from './ForkliftProvider';
import ForkliftStorageMap from './ForkliftStorageMap';

const STEPS = ['Source & Target', 'Select VMs', 'Namespace & Mappings', 'Review'];

interface CreatePlanDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CreatePlanDialog({ open, onClose }: CreatePlanDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sourceProvider, setSourceProvider] = useState('');
  const [destProvider, setDestProvider] = useState('');
  const [targetNamespace, setTargetNamespace] = useState('default');
  const [networkMap, setNetworkMap] = useState('');
  const [storageMap, setStorageMap] = useState('');
  const [creating, setCreating] = useState(false);

  // VM selection state
  const [sourceVMs, setSourceVMs] = useState<InventoryVM[]>([]);
  const [loadingVMs, setLoadingVMs] = useState(false);
  const [vmError, setVmError] = useState('');
  const [selectedVMIds, setSelectedVMIds] = useState<Set<string>>(new Set());
  const [vmFilter, setVmFilter] = useState('');
  const [expandedVmId, setExpandedVmId] = useState<string | null>(null);
  const [destNamespaces, setDestNamespaces] = useState<string[]>([]);

  // Fetch providers, network maps, storage maps for dropdowns
  const { items: providers } = ForkliftProvider.useList();
  const { items: networkMaps } = ForkliftNetworkMap.useList();
  const { items: storageMaps } = ForkliftStorageMap.useList();

  // Build provider options with type metadata for icons
  const providerOptions = useMemo(
    () =>
      (providers || []).map(p => {
        const type = p.getType();
        const meta = PROVIDER_TYPE_META[type] || PROVIDER_TYPE_META.openshift;
        return { name: p.getName(), type, icon: meta.icon, color: meta.color, label: meta.label };
      }),
    [providers]
  );

  const sourceProviderObj = useMemo(
    () => (providers || []).find(p => p.getName() === sourceProvider),
    [providers, sourceProvider]
  );
  const providerNamespace = sourceProviderObj?.getNamespace() || getForkliftNamespace();

  const destProviderObj = useMemo(
    () => (providers || []).find(p => p.getName() === destProvider),
    [providers, destProvider]
  );

  // Fetch namespaces from destination provider
  useEffect(() => {
    if (!destProviderObj) { setDestNamespaces([]); return; }
    const uid = destProviderObj.metadata?.uid;
    const type = destProviderObj.getType();
    if (!uid) return;
    getProviderNamespaces(type, uid).then(setDestNamespaces);
  }, [destProviderObj]);

  // Fetch VMs when entering step 1 (Select VMs)
  useEffect(() => {
    if (step !== 1 || !sourceProviderObj) return;
    const uid = sourceProviderObj.metadata?.uid;
    const type = sourceProviderObj.getType();
    if (!uid) return;

    setLoadingVMs(true);
    setVmError('');
    getProviderVMs(type, uid)
      .then(vms => {
        setSourceVMs(vms);
        if (vms.length === 0) setVmError('No VMs found for this provider');
      })
      .catch(() => setVmError('Failed to fetch VMs from inventory'))
      .finally(() => setLoadingVMs(false));
  }, [step, sourceProviderObj]);

  // Filtered VMs
  const filteredVMs = useMemo(() => {
    if (!vmFilter) return sourceVMs;
    const lower = vmFilter.toLowerCase();
    return sourceVMs.filter(
      vm =>
        vm.name?.toLowerCase().includes(lower) || vm.namespace?.toLowerCase().includes(lower)
    );
  }, [sourceVMs, vmFilter]);

  const toggleVM = (id: string) => {
    setSelectedVMIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedVMIds.size === filteredVMs.length) {
      setSelectedVMIds(new Set());
    } else {
      setSelectedVMIds(new Set(filteredVMs.map(vm => vm.id)));
    }
  };

  const selectedVMs = useMemo(
    () => sourceVMs.filter(vm => selectedVMIds.has(vm.id)),
    [sourceVMs, selectedVMIds]
  );

  const handleClose = () => {
    setStep(0);
    setName('');
    setSourceProvider('');
    setDestProvider('');
    setTargetNamespace('default');
    setNetworkMap('');
    setStorageMap('');
    setSourceVMs([]);
    setSelectedVMIds(new Set());
    setVmFilter('');
    onClose();
  };

  const buildPlanObject = () => {
    const mapSpec: Record<string, { name: string; namespace: string }> = {};
    if (networkMap) mapSpec.network = { name: networkMap, namespace: providerNamespace };
    if (storageMap) mapSpec.storage = { name: storageMap, namespace: providerNamespace };

    return {
      apiVersion: 'forklift.konveyor.io/v1beta1',
      kind: 'Plan',
      metadata: {
        name,
        namespace: providerNamespace,
      },
      spec: {
        provider: {
          source: { name: sourceProvider, namespace: providerNamespace },
          destination: { name: destProvider, namespace: providerNamespace },
        },
        targetNamespace,
        ...(Object.keys(mapSpec).length > 0 ? { map: mapSpec } : {}),
        vms: selectedVMs.map(vm => ({
          id: vm.id,
          name: vm.name,
          ...(vm.namespace ? { namespace: vm.namespace } : {}),
        })),
      },
    };
  };

  const handleCreate = async () => {
    if (!name || !sourceProvider || !destProvider || selectedVMs.length === 0) return;
    setCreating(true);

    try {
      const plan = buildPlanObject();

      await ApiProxy.request(
        `/apis/forklift.konveyor.io/v1beta1/namespaces/${providerNamespace}/plans`,
        {
          method: 'POST',
          body: JSON.stringify(plan),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      enqueueSnackbar(`Plan "${name}" created with ${selectedVMs.length} VM(s)`, {
        variant: 'success',
      });
      handleClose();
    } catch (e) {
      enqueueSnackbar(`Failed to create plan: ${safeError(e, 'plan-create')}`, {
        variant: 'error',
      });
    } finally {
      setCreating(false);
    }
  };

  const canProceedStep0 = name && sourceProvider && destProvider;
  const canProceedStep1 = selectedVMIds.size > 0;
  const canProceedStep2 = !!networkMap && !!storageMap;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Icon icon="mdi:clipboard-plus" width={24} />
          Create Import Plan
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={step} sx={{ my: 2 }}>
          {STEPS.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step 0: Source & Target */}
        {step === 0 && (
          <Box sx={{ mt: 2, maxWidth: 500 }}>
            <TextField
              fullWidth
              label="Plan Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              sx={{ mb: 2 }}
            />
            <Autocomplete
              options={providerOptions}
              getOptionLabel={o => (typeof o === 'string' ? o : o.name)}
              isOptionEqualToValue={(o, v) => o.name === (typeof v === 'string' ? v : v.name)}
              value={providerOptions.find(p => p.name === sourceProvider) || null}
              onChange={(_, v) => {
                setSourceProvider(v?.name || '');
                setSourceVMs([]);
                setSelectedVMIds(new Set());
              }}
              renderOption={(props, option) => (
                <li {...props} key={option.name}>
                  <Icon icon={option.icon} width={18} color={option.color} style={{ marginRight: 8 }} />
                  {option.name}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({option.label})
                  </Typography>
                </li>
              )}
              renderInput={params => (
                <TextField {...params} label="Source Provider" required sx={{ mb: 2 }} />
              )}
            />
            <Autocomplete
              options={providerOptions}
              getOptionLabel={o => (typeof o === 'string' ? o : o.name)}
              isOptionEqualToValue={(o, v) => o.name === (typeof v === 'string' ? v : v.name)}
              value={providerOptions.find(p => p.name === destProvider) || null}
              onChange={(_, v) => setDestProvider(v?.name || '')}
              renderOption={(props, option) => (
                <li {...props} key={option.name}>
                  <Icon icon={option.icon} width={18} color={option.color} style={{ marginRight: 8 }} />
                  {option.name}
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    ({option.label})
                  </Typography>
                </li>
              )}
              renderInput={params => (
                <TextField {...params} label="Destination Provider" required sx={{ mb: 2 }} />
              )}
            />
          </Box>
        )}

        {/* Step 1: Select VMs */}
        {step === 1 && (
          <Box sx={{ mt: 2 }}>
            {loadingVMs ? (
              <Box display="flex" justifyContent="center" alignItems="center" py={6}>
                <CircularProgress size={32} sx={{ mr: 2 }} />
                <Typography>Loading VMs from {sourceProvider}...</Typography>
              </Box>
            ) : vmError ? (
              <Box textAlign="center" py={4}>
                <Icon icon="mdi:alert-circle" width={40} color="#ff9800" />
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {vmError}
                </Typography>
              </Box>
            ) : (
              <>
                <Toolbar disableGutters sx={{ gap: 2, mb: 1 }}>
                  <TextField
                    size="small"
                    placeholder="Filter VMs..."
                    value={vmFilter}
                    onChange={e => setVmFilter(e.target.value)}
                    InputProps={{
                      startAdornment: <Icon icon="mdi:magnify" width={20} />,
                    }}
                    sx={{ minWidth: 250 }}
                  />
                  <Chip
                    label={`${selectedVMIds.size} selected`}
                    color={selectedVMIds.size > 0 ? 'primary' : 'default'}
                    size="small"
                  />
                  <Box flex={1} />
                  <Button size="small" onClick={toggleAll} variant="text">
                    {selectedVMIds.size === filteredVMs.length ? 'Deselect all' : 'Select all'}
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    {filteredVMs.length} VM(s)
                  </Typography>
                </Toolbar>
                <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
                  {filteredVMs.map(vm => {
                    const isSelected = selectedVMIds.has(vm.id);
                    const isExpanded = expandedVmId === vm.id;
                    const obj = vm.object as Record<string, unknown> | undefined;
                    const spec = (obj?.spec as Record<string, unknown>) || {};
                    const tmpl = (spec.template as Record<string, unknown>) || {};
                    const tmplSpec = (tmpl.spec as Record<string, unknown>) || {};
                    const domain = (tmplSpec.domain as Record<string, unknown>) || {};
                    const cpu = (domain.cpu as Record<string, unknown>) || {};
                    const mem = (domain.memory as Record<string, unknown>) || {};
                    const status = (obj?.status as Record<string, unknown>) || {};
                    const printableStatus = (status.printableStatus as string) || '';

                    // Extract networks
                    const networks = (tmplSpec.networks as Array<Record<string, unknown>>) || [];
                    const netLabels = networks.map(n => {
                      if (n.pod) return 'pod';
                      if (n.multus) return (n.multus as Record<string, string>).networkName || 'multus';
                      return n.name as string || '?';
                    });

                    // Extract volumes + storage info
                    const volumes = (tmplSpec.volumes as Array<Record<string, unknown>>) || [];
                    const dvTemplates = (spec.dataVolumeTemplates as Array<Record<string, unknown>>) || [];
                    const diskVolumes = volumes.filter(v => v.dataVolume || v.persistentVolumeClaim);
                    const storageClasses = new Set<string>();
                    const diskDetails: Array<{ name: string; size: string; sc: string }> = [];
                    for (const dvt of dvTemplates) {
                      const dvtSpec = (dvt.spec as Record<string, unknown>) || {};
                      const stor = (dvtSpec.storage as Record<string, unknown>) || {};
                      const sc = (stor.storageClassName as string) || '';
                      if (sc) storageClasses.add(sc);
                      const reqs = (stor.resources as Record<string, unknown>) || {};
                      const reqMap = (reqs.requests as Record<string, string>) || {};
                      diskDetails.push({
                        name: ((dvt.metadata as Record<string, string>)?.name) || '?',
                        size: reqMap.storage || '?',
                        sc,
                      });
                    }

                    const concerns = vm.concerns as Array<{ label: string; severity: string }> | undefined;

                    return (
                      <Box
                        key={vm.id}
                        sx={{
                          mb: 0.5,
                          borderRadius: 1,
                          border: '1px solid',
                          borderColor: isSelected ? 'primary.main' : 'divider',
                          bgcolor: isSelected ? 'action.selected' : 'background.paper',
                          transition: 'all 0.15s',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Compact row */}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.5,
                            py: 1,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                          onClick={() => toggleVM(vm.id)}
                        >
                          <Checkbox checked={isSelected} size="small" sx={{ p: 0.5 }} />
                          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                            <Icon icon="mdi:desktop-classic" width={18} />
                          </Box>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ minWidth: 120 }}>
                            {vm.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 80 }}>
                            {vm.namespace || '-'}
                          </Typography>
                          <Chip
                            label={printableStatus || '-'}
                            size="small"
                            variant="outlined"
                            sx={printableStatus === 'Running'
                              ? { borderColor: '#4caf50', color: '#4caf50' }
                              : {}}
                          />
                          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.85rem', color: 'text.secondary' }}>
                            <Icon icon="mdi:harddisk" width={15} />
                            {diskVolumes.length}
                          </Box>
                          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.85rem', color: 'text.secondary' }}>
                            <Icon icon="mdi:lan" width={15} />
                            {netLabels.length}
                          </Box>
                          <Box flex={1} />
                          {concerns && concerns.length > 0 && (
                            <Chip
                              label={concerns.some(c => c.severity === 'Critical') ? 'Critical' : `${concerns.length}`}
                              size="small"
                              color={concerns.some(c => c.severity === 'Critical') ? 'error' : 'warning'}
                              variant="outlined"
                              icon={<Icon icon="mdi:alert" width={14} />}
                              sx={{ height: 22 }}
                            />
                          )}
                          <IconButton
                            size="small"
                            onClick={e => {
                              e.stopPropagation();
                              setExpandedVmId(isExpanded ? null : vm.id);
                            }}
                          >
                            <Icon
                              icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                              width={18}
                            />
                          </IconButton>
                        </Box>

                        {/* Expandable details */}
                        <Collapse in={isExpanded}>
                          <Box sx={{ px: 2, pb: 1.5, pt: 0.5, bgcolor: 'action.hover' }}>
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto 1fr', gap: 0.5, rowGap: 0.8, fontSize: '0.8rem', '& > :nth-of-type(odd)': { color: 'text.secondary' } }}>
                              <span>CPU</span>
                              <span>{(cpu.cores as number) || '?'} cores</span>
                              <span>Memory</span>
                              <span>{(mem.guest as string) || '?'}</span>
                            </Box>

                            {diskDetails.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  Disks ({diskVolumes.length})
                                </Typography>
                                {diskDetails.map((d, i) => (
                                  <Box key={i} display="flex" alignItems="center" gap={1} sx={{ fontSize: '0.78rem', mt: 0.3 }}>
                                    <Icon icon="mdi:harddisk" width={14} color="#888" />
                                    <span>{d.name}</span>
                                    <Chip label={d.size} size="small" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.65rem' } }} />
                                    {d.sc && <Chip label={d.sc} size="small" variant="outlined" sx={{ height: 18, '& .MuiChip-label': { fontSize: '0.65rem' } }} />}
                                  </Box>
                                ))}
                              </Box>
                            )}

                            {netLabels.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  Networks ({netLabels.length})
                                </Typography>
                                <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.3}>
                                  {netLabels.map((n, i) => (
                                    <Chip
                                      key={i}
                                      label={n}
                                      size="small"
                                      variant="outlined"
                                      icon={<Icon icon="mdi:lan" width={14} />}
                                      sx={{ height: 22, '& .MuiChip-label': { fontSize: '0.7rem' } }}
                                    />
                                  ))}
                                </Box>
                              </Box>
                            )}

                            {concerns && concerns.length > 0 && (
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                  Concerns
                                </Typography>
                                {concerns.map((c, i) => (
                                  <Typography key={i} variant="caption" display="block" sx={{ mt: 0.2 }}>
                                    <Icon icon="mdi:alert" width={12} style={{ verticalAlign: 'text-bottom', marginRight: 4 }} />
                                    {c.label}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </Box>
                    );
                  })}
                </Box>
              </>
            )}
          </Box>
        )}

        {/* Step 2: Target Namespace & Mappings */}
        {step === 2 && (
          <Box sx={{ mt: 2, maxWidth: 500 }}>
            <Autocomplete
              freeSolo
              options={destNamespaces}
              value={targetNamespace}
              onInputChange={(_, v) => setTargetNamespace(v)}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Target Namespace"
                  helperText={destNamespaces.length > 0
                    ? `${destNamespaces.length} namespace(s) from destination provider — or type a new one`
                    : 'Namespace where imported VMs will be created'}
                  sx={{ mb: 2 }}
                />
              )}
            />
            <Autocomplete
              options={(networkMaps || []).map(m => m.getName())}
              value={networkMap || null}
              onChange={(_, v) => setNetworkMap(v || '')}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Network Map"
                  helperText="Select an existing NetworkMap resource"
                  sx={{ mb: 2 }}
                />
              )}
            />
            <Autocomplete
              options={(storageMaps || []).map(m => m.getName())}
              value={storageMap || null}
              onChange={(_, v) => setStorageMap(v || '')}
              renderInput={params => (
                <TextField
                  {...params}
                  label="Storage Map"
                  helperText="Select an existing StorageMap resource"
                  sx={{ mb: 2 }}
                />
              )}
            />
          </Box>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <Box sx={{ mt: 2 }}>
            {/* Recap */}
            <Typography variant="subtitle2" gutterBottom>
              Plan Summary
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 1.2, mb: 2 }}>
              {[
                ['Name', name],
                ['Source', sourceProvider],
                ['Destination', destProvider],
                ['Target Namespace', targetNamespace],
                ...(networkMap ? [['Network Map', networkMap]] : []),
                ...(storageMap ? [['Storage Map', storageMap]] : []),
              ].map(([label, value], i) => {
                const provObj = (label === 'Source' || label === 'Destination')
                  ? providerOptions.find(o => o.name === value)
                  : null;
                return (
                  <React.Fragment key={i}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    {provObj ? (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Icon icon={provObj.icon} width={16} color={provObj.color} />
                        <Typography variant="body2" fontWeight={500}>{provObj.name}</Typography>
                        <Typography variant="caption" color="text.secondary">({provObj.label})</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" fontWeight={500}>{value}</Typography>
                    )}
                  </React.Fragment>
                );
              })}
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Typography variant="subtitle2" gutterBottom>
              VMs ({selectedVMs.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
              {selectedVMs.map(vm => (
                <Chip
                  key={vm.id}
                  label={`${vm.name}${vm.namespace ? ` (${vm.namespace})` : ''}`}
                  size="small"
                  icon={<Icon icon="mdi:desktop-classic" width={14} />}
                  variant="outlined"
                />
              ))}
            </Box>

            {/* YAML Preview */}
            <Accordion
              disableGutters
              elevation={0}
              sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<Icon icon="mdi:chevron-down" width={20} />}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Icon icon="mdi:code-braces" width={18} />
                  <Typography variant="body2">YAML Preview</Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0, position: 'relative' }}>
                <Tooltip title="Copy YAML" arrow>
                  <IconButton
                    size="small"
                    onClick={e => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(toYaml(buildPlanObject()));
                    }}
                    sx={{ position: 'absolute', top: 8, right: 16, zIndex: 1 }}
                  >
                    <Icon icon="mdi:content-copy" width={16} />
                  </IconButton>
                </Tooltip>
                <Box
                  component="pre"
                  sx={{
                    bgcolor: 'action.hover',
                    color: 'text.primary',
                    p: 2,
                    pr: 5,
                    m: 0,
                    fontSize: '0.78rem',
                    overflow: 'auto',
                    maxHeight: 300,
                    userSelect: 'all',
                  }}
                >
                  {toYaml(buildPlanObject())}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Box flex={1} />
        {step > 0 && <Button onClick={() => setStep(s => s - 1)}>Back</Button>}
        {step < STEPS.length - 1 ? (
          <Button
            variant="contained"
            onClick={() => setStep(s => s + 1)}
            disabled={
              (step === 0 && !canProceedStep0) || (step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)
            }
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !canProceedStep0 || !canProceedStep1}
            startIcon={
              creating ? <Icon icon="mdi:loading" className="spin" /> : <Icon icon="mdi:check" />
            }
          >
            {creating ? 'Creating...' : 'Create Plan'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
