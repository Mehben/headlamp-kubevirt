import { Icon } from '@iconify/react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Meta, StoryFn } from '@storybook/react';
import { SnackbarProvider } from 'notistack';
import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

/**
 * Pure mock of the KubeVirt Settings page.
 * The real component depends on KubeVirt.useList(), CDI.useList(), ApiProxy.request()
 * — this replaces all that with local state so it runs standalone in Storybook.
 */

// Feature gate categories with same structure as real Settings
const FEATURE_GATE_CATEGORIES: Record<
  string,
  { icon: string; color: string; gates: { name: string; description: string; state: string }[] }
> = {
  Storage: {
    icon: 'mdi:harddisk',
    color: '#ff9800',
    gates: [
      { name: 'Snapshot', description: 'VM snapshot and restore support', state: 'Beta' },
      { name: 'VMExport', description: 'Export VMs to external storage', state: 'Beta' },
      {
        name: 'HotplugVolumes',
        description: 'Hot-plug storage disks to running VMs',
        state: 'Alpha',
      },
      { name: 'DataVolumes', description: 'Enable DataVolume support for storage', state: 'GA' },
      { name: 'VolumeMigration', description: 'Storage migration support', state: 'GA' },
    ],
  },
  Network: {
    icon: 'mdi:lan',
    color: '#2196f3',
    gates: [
      { name: 'LiveMigration', description: 'Live migration of VMs between nodes', state: 'GA' },
      {
        name: 'HotplugNICs',
        description: 'Hot-plug network interfaces to running VMs',
        state: 'GA',
      },
      { name: 'NetworkBindingPlugins', description: 'Custom network binding plugins', state: 'GA' },
    ],
  },
  Compute: {
    icon: 'mdi:cpu-64-bit',
    color: '#9c27b0',
    gates: [
      { name: 'NUMA', description: 'NUMA topology awareness', state: 'GA' },
      {
        name: 'VMLiveUpdateFeatures',
        description: 'Hot-plug CPU sockets to running VMs',
        state: 'GA',
      },
      { name: 'AlignCPUs', description: 'Align CPUs for emulator thread', state: 'Alpha' },
    ],
  },
  Devices: {
    icon: 'mdi:expansion-card',
    color: '#4caf50',
    gates: [
      { name: 'GPU', description: 'GPU passthrough support', state: 'GA' },
      { name: 'VSOCK', description: 'VM sockets for host-guest communication', state: 'Alpha' },
      { name: 'HostDevices', description: 'PCI/USB passthrough to VMs', state: 'Alpha' },
    ],
  },
  Security: {
    icon: 'mdi:shield-lock',
    color: '#f44336',
    gates: [
      { name: 'KubevirtSeccompProfile', description: 'Custom seccomp profile', state: 'Beta' },
      { name: 'WorkloadEncryptionSEV', description: 'AMD SEV memory encryption', state: 'Alpha' },
      { name: 'NonRoot', description: 'Run virt-launcher as non-root', state: 'GA' },
    ],
  },
  Migration: {
    icon: 'mdi:airplane',
    color: '#00bcd4',
    gates: [
      { name: 'VMPersistentState', description: 'Persist VM state across migrations', state: 'GA' },
      { name: 'NodeRestriction', description: 'Node restriction for virt-handler', state: 'Beta' },
    ],
  },
  Display: {
    icon: 'mdi:monitor',
    color: '#607d8b',
    gates: [
      { name: 'VideoConfig', description: 'Custom video device types', state: 'Beta' },
      {
        name: 'BochsDisplayForEFIGuests',
        description: 'Bochs display for EFI guests',
        state: 'GA',
      },
    ],
  },
  Other: {
    icon: 'mdi:cog',
    color: '#795548',
    gates: [
      {
        name: 'CommonInstancetypesDeploymentGate',
        description: 'Deploy common instance types',
        state: 'GA',
      },
      {
        name: 'MultiArchitecture',
        description: 'Multi-architecture VM scheduling',
        state: 'Alpha',
      },
    ],
  },
};

const STATE_COLORS: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  GA: 'success',
  Beta: 'warning',
  Alpha: 'error',
};

function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider maxSnack={3}>
      <BrowserRouter>
        <Box sx={{ p: 3, maxWidth: 1200 }}>{children}</Box>
      </BrowserRouter>
    </SnackbarProvider>
  );
}

function SettingsPageMock() {
  const [enabledGates, setEnabledGates] = useState<string[]>([
    'Snapshot',
    'VMExport',
    'DataVolumes',
    'LiveMigration',
    'HotplugNICs',
    'NUMA',
    'GPU',
    'NonRoot',
    'VMPersistentState',
    'BochsDisplayForEFIGuests',
    'NetworkBindingPlugins',
    'VMLiveUpdateFeatures',
    'VolumeMigration',
    'CommonInstancetypesDeploymentGate',
  ]);
  const [pluginFeaturesExpanded, setPluginFeaturesExpanded] = useState(true);
  const [generalConfigExpanded, setGeneralConfigExpanded] = useState(false);
  const [labelColumnsExpanded, setLabelColumnsExpanded] = useState(false);
  const [deleteProtectionDeployed, setDeleteProtectionDeployed] = useState(true);
  const [commonInstancetypes, setCommonInstancetypes] = useState(true);
  const [memoryOvercommit, setMemoryOvercommit] = useState(100);
  const [evictionStrategy, setEvictionStrategy] = useState('LiveMigrate');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [labelColumns] = useState([
    { label: 'App', labelKey: 'app.kubernetes.io/name' },
    { label: 'Environment', labelKey: 'env' },
  ]);

  const toggleGate = (gate: string) => {
    setEnabledGates(prev => (prev.includes(gate) ? prev.filter(g => g !== gate) : [...prev, gate]));
  };

  return (
    <StoryWrapper>
      <Typography variant="h4" gutterBottom>
        KubeVirt Configuration
      </Typography>

      {/* Version Information */}
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '4px', p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Version Information
        </Typography>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
          {/* KubeVirt Card */}
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Icon icon="mdi:kubernetes" width={32} height={32} color="#326CE5" />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  KubeVirt
                </Typography>
                <Tooltip title="Edit KubeVirt CR">
                  <IconButton size="small">
                    <Icon icon="mdi:pencil" width={18} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Version
                </Typography>
                <Chip label="v1.7.0" color="primary" size="small" />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip label="Ready" color="success" size="small" />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Namespace
                </Typography>
                <Chip label="kubevirt" size="small" variant="outlined" />
              </Box>
            </CardContent>
          </Card>

          {/* CDI Card */}
          <Card variant="outlined">
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Icon icon="mdi:harddisk" width={32} height={32} color="#FF6F00" />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  CDI (Containerized Data Importer)
                </Typography>
                <Tooltip title="Edit CDI CR">
                  <IconButton size="small">
                    <Icon icon="mdi:pencil" width={18} />
                  </IconButton>
                </Tooltip>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Version
                </Typography>
                <Chip label="v1.60.3" color="primary" size="small" />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip label="Deployed" color="success" size="small" />
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Feature Gates
                </Typography>
                <Chip label="3" size="small" variant="outlined" />
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Plugin Features — purple collapsible */}
      <Box
        sx={{
          backgroundColor: 'rgba(156, 39, 176, 0.05)',
          borderRadius: '4px',
          border: '1px solid rgba(156, 39, 176, 0.2)',
          mb: 3,
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          p={2}
          sx={{ cursor: 'pointer' }}
          onClick={() => setPluginFeaturesExpanded(!pluginFeaturesExpanded)}
        >
          <Icon
            icon="mdi:puzzle"
            width={28}
            height={28}
            style={{ color: pluginFeaturesExpanded ? '#9c27b0' : '#9e9e9e' }}
          />
          <Typography variant="h6" flex={1}>
            Plugin Features
          </Typography>
          <Chip
            label="Headlamp Plugin"
            size="small"
            sx={{
              backgroundColor: 'rgba(156, 39, 176, 0.2)',
              color: '#ce93d8',
              borderColor: '#9c27b0',
            }}
            variant="outlined"
          />
          <Icon icon={pluginFeaturesExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={24} />
        </Box>
        <Collapse in={pluginFeaturesExpanded}>
          <Box p={2} pt={0}>
            <Alert severity="info" sx={{ mb: 2 }}>
              These features are provided by the Headlamp KubeVirt plugin and deploy additional
              Kubernetes resources to enable functionality.
            </Alert>
            <Card variant="outlined">
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box flex={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1" fontWeight={500}>
                        VM Delete Protection
                      </Typography>
                      <IconButton size="small">
                        <Icon icon="mdi:information-outline" width={20} />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Prevent accidental deletion of VMs using ValidatingAdmissionPolicy
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Chip
                      label={deleteProtectionDeployed ? 'Deployed' : 'Not Deployed'}
                      color={deleteProtectionDeployed ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                    <Button
                      variant={deleteProtectionDeployed ? 'outlined' : 'contained'}
                      size="small"
                      color={deleteProtectionDeployed ? 'error' : 'primary'}
                      onClick={() => setDeleteProtectionDeployed(!deleteProtectionDeployed)}
                    >
                      {deleteProtectionDeployed ? 'Remove' : 'Deploy'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Collapse>
      </Box>

      {/* Custom Label Columns — green collapsible */}
      <Box
        sx={{
          backgroundColor: 'rgba(76, 175, 80, 0.05)',
          borderRadius: '4px',
          border: '1px solid rgba(76, 175, 80, 0.2)',
          p: 2,
          mb: 3,
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={2}
          sx={{ cursor: 'pointer' }}
          onClick={() => setLabelColumnsExpanded(!labelColumnsExpanded)}
        >
          <Icon
            icon="mdi:table-column-plus-after"
            width={28}
            height={28}
            style={{ color: labelColumnsExpanded ? '#4caf50' : '#9e9e9e' }}
          />
          <Typography variant="h6" flex={1}>
            VM List Custom Columns
          </Typography>
          <Chip
            label="Plugin Setting"
            size="small"
            sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4caf50', fontWeight: 500 }}
          />
          <Icon icon={labelColumnsExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={24} />
        </Box>
        <Collapse in={labelColumnsExpanded}>
          <Box pt={2}>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={500} mb={2}>
                  Add New Column
                </Typography>
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Column Name" placeholder="e.g., App" />
                  </Grid>
                  <Grid item xs={12} sm={5}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Label Key"
                      placeholder="e.g., app.kubernetes.io/name"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      fullWidth
                      variant="contained"
                      size="small"
                      startIcon={<Icon icon="mdi:plus" />}
                    >
                      Add
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" fontWeight={500} mb={2}>
                  Current Custom Columns
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  {labelColumns.map(col => (
                    <Box
                      key={col.labelKey}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      p={1}
                      sx={{ backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '4px' }}
                    >
                      <Box>
                        <Typography variant="body2" fontWeight={500}>
                          {col.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {col.labelKey}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="error">
                        <Icon icon="mdi:delete" width={20} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Collapse>
      </Box>

      {/* General Configuration — blue collapsible */}
      <Box
        sx={{
          backgroundColor: 'rgba(33, 150, 243, 0.05)',
          borderRadius: '4px',
          border: '1px solid rgba(33, 150, 243, 0.2)',
          mb: 3,
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          gap={1}
          p={2}
          sx={{ cursor: 'pointer' }}
          onClick={() => setGeneralConfigExpanded(!generalConfigExpanded)}
        >
          <Icon
            icon="mdi:cog"
            width={28}
            height={28}
            style={{ color: generalConfigExpanded ? '#2196f3' : '#9e9e9e' }}
          />
          <Typography variant="h6" flex={1}>
            General Configuration
          </Typography>
          <Icon icon={generalConfigExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={24} />
        </Box>
        <Collapse in={generalConfigExpanded}>
          <Box p={2} pt={0}>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box flex={1}>
                    <Typography variant="body1" fontWeight={500}>
                      Common Instance Types Deployment
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Deploy predefined VM instance types (u1.small, u1.medium, etc.)
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={commonInstancetypes}
                        onChange={(_, c) => setCommonInstancetypes(c)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#4caf50' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: '#4caf50',
                          },
                        }}
                      />
                    }
                    label={
                      <Typography
                        variant="body2"
                        sx={{
                          color: commonInstancetypes ? '#4caf50' : '#f44336',
                          fontWeight: commonInstancetypes ? 600 : 400,
                          minWidth: 85,
                        }}
                      >
                        {commonInstancetypes ? 'Enabled' : 'Disabled'}
                      </Typography>
                    }
                  />
                </Box>
              </CardContent>
            </Card>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="body1" fontWeight={500} mb={1}>
                  Memory Overcommit
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  Percentage of memory to allocate beyond physical capacity
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Slider
                    value={memoryOvercommit}
                    onChange={(_, v) => setMemoryOvercommit(v as number)}
                    min={100}
                    max={200}
                    step={10}
                    valueLabelDisplay="auto"
                    sx={{ flex: 1 }}
                  />
                  <Chip
                    label={`${memoryOvercommit}%`}
                    size="small"
                    color={memoryOvercommit > 100 ? 'warning' : 'default'}
                  />
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#45a049' } }}
                  >
                    Apply
                  </Button>
                </Box>
              </CardContent>
            </Card>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body1" fontWeight={500} mb={1}>
                  Eviction Strategy
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <FormControl size="small" sx={{ flex: 1 }}>
                    <InputLabel>Strategy</InputLabel>
                    <Select
                      value={evictionStrategy}
                      label="Strategy"
                      onChange={e => setEvictionStrategy(e.target.value)}
                    >
                      <MenuItem value="">None</MenuItem>
                      <MenuItem value="LiveMigrate">Live Migrate</MenuItem>
                      <MenuItem value="External">External</MenuItem>
                    </Select>
                  </FormControl>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{ backgroundColor: '#4caf50', '&:hover': { backgroundColor: '#45a049' } }}
                  >
                    Apply
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Collapse>
      </Box>

      {/* Feature Gates */}
      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: '4px', p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Feature Gates
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Toggle KubeVirt feature gates. Changes are applied directly to the KubeVirt CR.
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {Object.entries(FEATURE_GATE_CATEGORIES).map(([category, { icon, color, gates }]) => (
            <Card
              key={category}
              variant="outlined"
              sx={{
                borderLeft: `3px solid ${color}`,
                cursor: 'pointer',
                transition: 'background-color 0.15s',
                '&:hover': { backgroundColor: `${color}08` },
              }}
            >
              <CardContent sx={{ pb: '12px !important' }}>
                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  mb={activeCategory === category ? 2 : 0}
                  onClick={() => setActiveCategory(activeCategory === category ? null : category)}
                >
                  <Icon icon={icon} width={22} color={color} />
                  <Typography variant="subtitle1" fontWeight={600} flex={1}>
                    {category}
                  </Typography>
                  <Chip
                    label={`${gates.filter(g => enabledGates.includes(g.name)).length}/${
                      gates.length
                    }`}
                    size="small"
                    sx={{ bgcolor: `${color}20`, color, fontWeight: 600 }}
                  />
                  <Icon
                    icon={activeCategory === category ? 'mdi:chevron-up' : 'mdi:chevron-down'}
                    width={20}
                  />
                </Box>
                <Collapse in={activeCategory === category}>
                  {gates.map(gate => (
                    <Box
                      key={gate.name}
                      display="flex"
                      alignItems="center"
                      gap={1}
                      py={1}
                      sx={{ borderTop: 1, borderColor: 'divider' }}
                    >
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight={500}>
                            {gate.name}
                          </Typography>
                          <Chip
                            label={gate.state}
                            size="small"
                            color={STATE_COLORS[gate.state] || 'default'}
                            variant="outlined"
                            sx={{ height: 20, fontSize: '0.65rem' }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {gate.description}
                        </Typography>
                      </Box>
                      <Switch
                        size="small"
                        checked={enabledGates.includes(gate.name)}
                        onChange={() => toggleGate(gate.name)}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: color,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Collapse>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    </StoryWrapper>
  );
}

// ----- Meta -----

export default {
  title: 'KubeVirt/Templates/Settings',
  component: SettingsPageMock,
} as Meta;

export const Default: StoryFn = () => <SettingsPageMock />;
Default.storyName = 'Settings Page';
