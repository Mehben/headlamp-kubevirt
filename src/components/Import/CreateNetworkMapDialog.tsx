import { Icon } from '@iconify/react';
import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  Divider,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import React, { useEffect, useMemo, useState } from 'react';
import {
  getProviderNetworks,
  InventoryNetwork,
} from '../../utils/forkliftInventory';
import { safeError } from '../../utils/sanitize';
import { toYaml } from '../../utils/yamlSerialize';
import ForkliftProvider, { PROVIDER_TYPE_META } from './ForkliftProvider';

interface MappingEntry {
  sourceId: string;
  sourceName: string;
  sourceNamespace?: string;
  destinationType: string; // 'pod' or NAD name
  destinationName?: string;
  destinationNamespace?: string;
}

interface CreateNetworkMapDialogProps {
  open: boolean;
  onClose: () => void;
  namespace?: string;
}

export default function CreateNetworkMapDialog({
  open,
  onClose,
  namespace = 'konveyor-forklift',
}: CreateNetworkMapDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(0); // 0=Mappings, 1=Review
  const [name, setName] = useState('');
  const [sourceProvider, setSourceProvider] = useState('');
  const [destProvider, setDestProvider] = useState('');
  const [creating, setCreating] = useState(false);

  // Inventory data
  const [sourceNets, setSourceNets] = useState<InventoryNetwork[]>([]);
  const [destNets, setDestNets] = useState<InventoryNetwork[]>([]);
  const [loadingSource, setLoadingSource] = useState(false);
  const [loadingDest, setLoadingDest] = useState(false);

  // Mapping entries
  const [mappings, setMappings] = useState<MappingEntry[]>([]);

  const { items: providers } = ForkliftProvider.useList();
  const providerOptions = useMemo(
    () =>
      (providers || []).map(p => {
        const type = p.getType();
        const meta = PROVIDER_TYPE_META[type] || PROVIDER_TYPE_META.openshift;
        return { name: p.getName(), type, uid: p.metadata?.uid || '', icon: meta.icon, color: meta.color, label: meta.label };
      }),
    [providers]
  );

  const sourceProviderObj = useMemo(
    () => providerOptions.find(p => p.name === sourceProvider),
    [providerOptions, sourceProvider]
  );
  const destProviderObj = useMemo(
    () => providerOptions.find(p => p.name === destProvider),
    [providerOptions, destProvider]
  );

  // Fetch source networks
  useEffect(() => {
    if (!sourceProviderObj) { setSourceNets([]); return; }
    setLoadingSource(true);
    getProviderNetworks(sourceProviderObj.type, sourceProviderObj.uid)
      .then(setSourceNets)
      .finally(() => setLoadingSource(false));
  }, [sourceProviderObj]);

  // Fetch destination networks
  useEffect(() => {
    if (!destProviderObj) { setDestNets([]); return; }
    setLoadingDest(true);
    getProviderNetworks(destProviderObj.type, destProviderObj.uid)
      .then(setDestNets)
      .finally(() => setLoadingDest(false));
  }, [destProviderObj]);

  // IDs already mapped
  const mappedIds = useMemo(() => new Set(mappings.map(m => m.sourceId)), [mappings]);

  const addMapping = () => {
    setMappings(prev => [
      ...prev,
      { sourceId: '', sourceName: '', destinationType: 'pod' },
    ]);
  };

  const updateMapping = (idx: number, updates: Partial<MappingEntry>) => {
    setMappings(prev => prev.map((m, i) => (i === idx ? { ...m, ...updates } : m)));
  };

  const removeMapping = (idx: number) => {
    setMappings(prev => prev.filter((_, i) => i !== idx));
  };

  /** Map ALL source networks to a single destination in one click */
  const mapAllTo = (destType: string, destName?: string, destNs?: string) => {
    setMappings(
      sourceNets.map(n => ({
        sourceId: n.id,
        sourceName: n.name,
        sourceNamespace: n.namespace,
        destinationType: destType,
        destinationName: destName,
        destinationNamespace: destNs,
      }))
    );
  };

  /** Map remaining unmapped source networks to ignored */
  const ignoreRemaining = () => {
    const newEntries = sourceNets
      .filter(n => !mappedIds.has(n.id))
      .map(n => ({
        sourceId: n.id,
        sourceName: n.name,
        sourceNamespace: n.namespace,
        destinationType: 'ignored' as const,
        destinationName: undefined,
        destinationNamespace: undefined,
      }));
    setMappings(prev => [...prev, ...newEntries]);
  };

  const handleClose = () => {
    setStep(0);
    setName('');
    setSourceProvider('');
    setDestProvider('');
    setMappings([]);
    setSourceNets([]);
    setDestNets([]);
    onClose();
  };

  const buildObject = () => ({
    apiVersion: 'forklift.konveyor.io/v1beta1',
    kind: 'NetworkMap',
    metadata: { name, namespace },
    spec: {
      provider: {
        source: { name: sourceProvider, namespace },
        destination: { name: destProvider, namespace },
      },
      map: mappings.map(m => ({
        source: { id: m.sourceId, name: m.sourceName, ...(m.sourceNamespace ? { namespace: m.sourceNamespace } : {}) },
        destination: m.destinationType === 'pod'
          ? { type: 'pod' }
          : m.destinationType === 'ignored'
          ? { type: 'ignored' }
          : { type: 'multus', name: m.destinationName || m.destinationType, namespace: m.destinationNamespace || 'default' },
      })),
    },
  });

  const handleCreate = async () => {
    if (!name || !sourceProvider || !destProvider || mappings.length === 0) return;
    setCreating(true);
    try {
      const networkMap = buildObject();
      await ApiProxy.request(
        `/apis/forklift.konveyor.io/v1beta1/namespaces/${namespace}/networkmaps`,
        { method: 'POST', body: JSON.stringify(networkMap), headers: { 'Content-Type': 'application/json' } }
      );
      enqueueSnackbar(`Network Map "${name}" created`, { variant: 'success' });
      handleClose();
    } catch (e) {
      enqueueSnackbar(`Failed: ${safeError(e, 'netmap-create')}`, { variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const destNetOptions = useMemo(
    () => [
      { value: 'pod', label: 'Pod Network (default)', namespace: '', icon: 'mdi:kubernetes' },
      { value: 'ignored', label: 'Ignore (detach NIC)', namespace: '', icon: 'mdi:close-circle-outline' },
      ...destNets.map(n => ({
        value: n.name,
        label: `${n.name}${n.namespace ? ` (${n.namespace})` : ''}`,
        namespace: n.namespace || '',
        icon: 'mdi:lan',
      })),
    ],
    [destNets]
  );

  const unmappedCount = sourceNets.filter(n => !mappedIds.has(n.id)).length;
  // Only show unmapped sources in the source dropdown
  const availableSources = useMemo(
    () => sourceNets.filter(n => !mappedIds.has(n.id)),
    [sourceNets, mappedIds]
  );
  const [mapAllAnchor, setMapAllAnchor] = useState<HTMLElement | null>(null);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Icon icon="mdi:lan-connect" width={24} />
          Create Network Map
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} sx={{ my: 2 }}>
          <Step><StepLabel>Mappings</StepLabel></Step>
          <Step><StepLabel>Review</StepLabel></Step>
        </Stepper>

        {step === 0 && (<>
        <Box sx={{ mt: 1, display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            sx={{ flex: 1 }}
            size="small"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Autocomplete
            options={providerOptions}
            getOptionLabel={o => (typeof o === 'string' ? o : o.name)}
            isOptionEqualToValue={(o, v) => o.name === (typeof v === 'string' ? v : v.name)}
            value={providerOptions.find(p => p.name === sourceProvider) || null}
            onChange={(_, v) => { setSourceProvider(v?.name || ''); setMappings([]); }}
            renderOption={(props, option) => (
              <li {...props} key={option.name}>
                <Icon icon={option.icon} width={16} color={option.color} style={{ marginRight: 6 }} />
                {option.name}
              </li>
            )}
            renderInput={params => <TextField {...params} label="Source Provider" required size="small" />}
            sx={{ flex: 1 }}
          />
          <Autocomplete
            options={providerOptions}
            getOptionLabel={o => (typeof o === 'string' ? o : o.name)}
            isOptionEqualToValue={(o, v) => o.name === (typeof v === 'string' ? v : v.name)}
            value={providerOptions.find(p => p.name === destProvider) || null}
            onChange={(_, v) => setDestProvider(v?.name || '')}
            renderOption={(props, option) => (
              <li {...props} key={option.name}>
                <Icon icon={option.icon} width={16} color={option.color} style={{ marginRight: 6 }} />
                {option.name}
              </li>
            )}
            renderInput={params => <TextField {...params} label="Destination Provider" required size="small" />}
            sx={{ flex: 1 }}
          />
        </Box>

        {/* Mapping entries */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="subtitle2">
            Network Mappings
            {mappings.length > 0 && (
              <Chip label={`${mappings.length}/${sourceNets.length}`} size="small" sx={{ ml: 1, height: 20 }} />
            )}
          </Typography>
          <Box display="flex" gap={0.5}>
            <Button
              size="small"
              startIcon={<Icon icon="mdi:plus" width={16} />}
              onClick={addMapping}
              disabled={!sourceProvider || !destProvider}
            >
              Add
            </Button>
          </Box>
        </Box>

        {/* Map all dropdown */}
        {sourceNets.length > 0 && !loadingSource && !loadingDest && (
          <>
            <Button
              size="small"
              variant="outlined"
              endIcon={<Icon icon="mdi:chevron-down" width={16} />}
              onClick={e => setMapAllAnchor(e.currentTarget)}
              sx={{ mb: 1.5 }}
            >
              Map all →
            </Button>
            <Menu
              anchorEl={mapAllAnchor}
              open={Boolean(mapAllAnchor)}
              onClose={() => setMapAllAnchor(null)}
              slotProps={{ paper: { sx: { maxHeight: 300 } } }}
            >
              <MenuItem onClick={() => { mapAllTo('pod'); setMapAllAnchor(null); }}>
                <ListItemIcon><Icon icon="mdi:kubernetes" width={18} /></ListItemIcon>
                <ListItemText>Pod Network (default)</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => { mapAllTo('ignored'); setMapAllAnchor(null); }}>
                <ListItemIcon><Icon icon="mdi:close-circle-outline" width={18} /></ListItemIcon>
                <ListItemText>Ignore (detach NIC)</ListItemText>
              </MenuItem>
              {destNets.length > 0 && <Divider />}
              {destNets.map(n => (
                <MenuItem key={n.id} onClick={() => { mapAllTo(n.name, n.name, n.namespace); setMapAllAnchor(null); }}>
                  <ListItemIcon><Icon icon="mdi:lan" width={18} /></ListItemIcon>
                  <ListItemText>{n.name}{n.namespace ? ` (${n.namespace})` : ''}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

        {(loadingSource || loadingDest) && (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography variant="body2">Loading networks...</Typography>
          </Box>
        )}

        {mappings.length === 0 && !loadingSource && !loadingDest && (
          <Box textAlign="center" py={3} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No mappings yet. Select providers and click "Add Mapping" to map source networks to destination networks.
            </Typography>
          </Box>
        )}

        {mappings.map((m, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              mb: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            {/* Source network */}
            <TextField
              select
              label="Source Network"
              value={m.sourceId}
              onChange={e => {
                const net = sourceNets.find(n => n.id === e.target.value);
                updateMapping(idx, {
                  sourceId: e.target.value,
                  sourceName: net?.name || '',
                  sourceNamespace: net?.namespace,
                });
              }}
              size="small"
              sx={{ flex: 1 }}
            >
              {sourceNets.filter(n => n.id === m.sourceId || !mappedIds.has(n.id)).map(n => (
                <MenuItem key={n.id} value={n.id}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Icon icon="mdi:lan" width={14} />
                    {n.name}
                    {n.namespace && (
                      <Chip label={n.namespace} size="small" variant="outlined" sx={{ height: 18, ml: 0.5, '& .MuiChip-label': { fontSize: '0.65rem' } }} />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <Icon icon="mdi:arrow-right" width={20} color="#888" />

            {/* Destination network */}
            <TextField
              select
              label="Destination Network"
              value={m.destinationType}
              onChange={e => {
                const opt = destNetOptions.find(o => o.value === e.target.value);
                updateMapping(idx, {
                  destinationType: e.target.value,
                  destinationName: (opt?.value === 'pod' || opt?.value === 'ignored') ? undefined : opt?.value,
                  destinationNamespace: opt?.namespace || undefined,
                });
              }}
              size="small"
              sx={{ flex: 1 }}
            >
              {destNetOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Icon icon={opt.icon} width={14} />
                    {opt.label}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <Tooltip title="Remove mapping" arrow>
              <IconButton size="small" onClick={() => removeMapping(idx)}>
                <Icon icon="mdi:close" width={18} />
              </IconButton>
            </Tooltip>
          </Box>
        ))}

        </>)}

        {/* Step 1: Review */}
        {step === 1 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Network Map Summary</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 1, mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Name</Typography>
              <Typography variant="body2" fontWeight={500}>{name}</Typography>
              <Typography variant="body2" color="text.secondary">Source</Typography>
              <Typography variant="body2" fontWeight={500}>{sourceProvider}</Typography>
              <Typography variant="body2" color="text.secondary">Destination</Typography>
              <Typography variant="body2" fontWeight={500}>{destProvider}</Typography>
              <Typography variant="body2" color="text.secondary">Mappings</Typography>
              <Typography variant="body2" fontWeight={500}>{mappings.length}</Typography>
            </Box>

            <Divider sx={{ my: 1.5 }} />

            <Accordion
              disableGutters
              elevation={0}
              defaultExpanded
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
                    onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(toYaml(buildObject())); }}
                    sx={{ position: 'absolute', top: 8, right: 16, zIndex: 1 }}
                  >
                    <Icon icon="mdi:content-copy" width={16} />
                  </IconButton>
                </Tooltip>
                <Box
                  component="pre"
                  sx={{ bgcolor: 'action.hover', color: 'text.primary', p: 2, pr: 5, m: 0, fontSize: '0.78rem', overflow: 'auto', maxHeight: 300, userSelect: 'all' }}
                >
                  {toYaml(buildObject())}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>Cancel</Button>
        <Box flex={1} />
        {step > 0 && <Button onClick={() => setStep(0)}>Back</Button>}
        {step === 0 ? (
          <Button
            variant="contained"
            onClick={() => setStep(1)}
            disabled={!name || !sourceProvider || !destProvider || mappings.length === 0}
          >
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating}
            startIcon={creating ? <Icon icon="mdi:loading" className="spin" /> : <Icon icon="mdi:check" />}
          >
            {creating ? 'Creating...' : 'Create Network Map'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
