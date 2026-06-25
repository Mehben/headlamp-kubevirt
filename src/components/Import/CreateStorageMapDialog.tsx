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
  DialogContent,
  DialogTitle,
  Divider,
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
  getProviderStorage,
  InventoryStorage,
} from '../../utils/forkliftInventory';
import { safeError } from '../../utils/sanitize';
import { toYaml } from '../../utils/yamlSerialize';
import ForkliftProvider, { PROVIDER_TYPE_META } from './ForkliftProvider';

interface MappingEntry {
  sourceId: string;
  sourceName: string;
  destinationStorageClass: string;
}

interface CreateStorageMapDialogProps {
  open: boolean;
  onClose: () => void;
  namespace?: string;
}

export default function CreateStorageMapDialog({
  open,
  onClose,
  namespace = 'konveyor-forklift',
}: CreateStorageMapDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [sourceProvider, setSourceProvider] = useState('');
  const [destProvider, setDestProvider] = useState('');
  const [creating, setCreating] = useState(false);

  // Inventory data
  const [sourceStorage, setSourceStorage] = useState<InventoryStorage[]>([]);
  const [destStorage, setDestStorage] = useState<InventoryStorage[]>([]);
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

  // Fetch source storage
  useEffect(() => {
    if (!sourceProviderObj) { setSourceStorage([]); return; }
    setLoadingSource(true);
    getProviderStorage(sourceProviderObj.type, sourceProviderObj.uid)
      .then(setSourceStorage)
      .finally(() => setLoadingSource(false));
  }, [sourceProviderObj]);

  // Fetch destination storage
  useEffect(() => {
    if (!destProviderObj) { setDestStorage([]); return; }
    setLoadingDest(true);
    getProviderStorage(destProviderObj.type, destProviderObj.uid)
      .then(setDestStorage)
      .finally(() => setLoadingDest(false));
  }, [destProviderObj]);

  const mappedIds = useMemo(() => new Set(mappings.map(m => m.sourceId)), [mappings]);
  const [mapAllAnchor, setMapAllAnchor] = useState<HTMLElement | null>(null);

  const addMapping = () => {
    setMappings(prev => [
      ...prev,
      { sourceId: '', sourceName: '', destinationStorageClass: '' },
    ]);
  };

  const updateMapping = (idx: number, updates: Partial<MappingEntry>) => {
    setMappings(prev => prev.map((m, i) => (i === idx ? { ...m, ...updates } : m)));
  };

  const removeMapping = (idx: number) => {
    setMappings(prev => prev.filter((_, i) => i !== idx));
  };

  /** Map ALL source storage classes to one destination storage class */
  const mapAllTo = (destSc: string) => {
    setMappings(
      sourceStorage.map(s => ({
        sourceId: s.id,
        sourceName: s.name,
        destinationStorageClass: destSc,
      }))
    );
  };

  const handleClose = () => {
    setStep(0);
    setName('');
    setSourceProvider('');
    setDestProvider('');
    setMappings([]);
    setSourceStorage([]);
    setDestStorage([]);
    onClose();
  };

  const buildObject = () => ({
    apiVersion: 'forklift.konveyor.io/v1beta1',
    kind: 'StorageMap',
    metadata: { name, namespace },
    spec: {
      provider: {
        source: { name: sourceProvider, namespace },
        destination: { name: destProvider, namespace },
      },
      map: mappings.map(m => ({
        source: { id: m.sourceId, name: m.sourceName },
        destination: { storageClass: m.destinationStorageClass },
      })),
    },
  });

  const handleCreate = async () => {
    if (!name || !sourceProvider || !destProvider || mappings.length === 0) return;
    setCreating(true);
    try {
      await ApiProxy.request(
        `/apis/forklift.konveyor.io/v1beta1/namespaces/${namespace}/storagemaps`,
        { method: 'POST', body: JSON.stringify(buildObject()), headers: { 'Content-Type': 'application/json' } }
      );
      enqueueSnackbar(`Storage Map "${name}" created`, { variant: 'success' });
      handleClose();
    } catch (e) {
      enqueueSnackbar(`Failed: ${safeError(e, 'storagemap-create')}`, { variant: 'error' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Icon icon="mdi:harddisk" width={24} />
          Create Storage Map
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
            Storage Mappings
            {mappings.length > 0 && (
              <Chip label={`${mappings.length}/${sourceStorage.length}`} size="small" sx={{ ml: 1, height: 20 }} />
            )}
          </Typography>
          <Button
            size="small"
            startIcon={<Icon icon="mdi:plus" width={16} />}
            onClick={addMapping}
            disabled={!sourceProvider || !destProvider}
          >
            Add
          </Button>
        </Box>

        {/* Map all dropdown */}
        {sourceStorage.length > 0 && destStorage.length > 0 && !loadingSource && !loadingDest && (
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
            >
              {destStorage.map(s => (
                <MenuItem key={s.id} onClick={() => { mapAllTo(s.name); setMapAllAnchor(null); }}>
                  <ListItemIcon><Icon icon="mdi:database" width={18} /></ListItemIcon>
                  <ListItemText>{s.name}</ListItemText>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

        {(loadingSource || loadingDest) && (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography variant="body2">Loading storage classes...</Typography>
          </Box>
        )}

        {mappings.length === 0 && !loadingSource && !loadingDest && (
          <Box textAlign="center" py={3} sx={{ border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No mappings yet. Select providers and click "Add Mapping" to map source storage classes to destination storage classes.
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
            {/* Source storage class */}
            <TextField
              select
              label="Source Storage"
              value={m.sourceId}
              onChange={e => {
                const sc = sourceStorage.find(s => s.id === e.target.value);
                updateMapping(idx, {
                  sourceId: e.target.value,
                  sourceName: sc?.name || '',
                });
              }}
              size="small"
              sx={{ flex: 1 }}
            >
              {sourceStorage.filter(s => s.id === m.sourceId || !mappedIds.has(s.id)).map(s => (
                <MenuItem key={s.id} value={s.id}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Icon icon="mdi:database" width={14} />
                    {s.name}
                  </Box>
                </MenuItem>
              ))}
            </TextField>

            <Icon icon="mdi:arrow-right" width={20} color="#888" />

            {/* Destination storage class */}
            <TextField
              select
              label="Destination Storage Class"
              value={m.destinationStorageClass}
              onChange={e => updateMapping(idx, { destinationStorageClass: e.target.value })}
              size="small"
              sx={{ flex: 1 }}
            >
              {destStorage.map(s => (
                <MenuItem key={s.id} value={s.name}>
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <Icon icon="mdi:database" width={14} />
                    {s.name}
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

        {/* Review section */}
        </>)}

        {/* Step 1: Review */}
        {step === 1 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Storage Map Summary</Typography>
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
            {creating ? 'Creating...' : 'Create Storage Map'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
