import {
  Autocomplete,
  Box,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  Radio,
  RadioGroup,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Meta, StoryFn } from '@storybook/react';
import { SnackbarProvider } from 'notistack';
import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import CreateButtonWithMode from './CreateButtonWithMode';
import FormSection, { SECTION_COLORS } from './FormSection';

function StoryWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SnackbarProvider maxSnack={3}>
      <BrowserRouter>
        <Box sx={{ p: 3, maxWidth: 1000 }}>{children}</Box>
      </BrowserRouter>
    </SnackbarProvider>
  );
}

// ----- Story 1: Color Palette Reference -----

function ColorPaletteShowcase() {
  return (
    <StoryWrapper>
      <Typography variant="h5" gutterBottom>
        Form Section Color Palette
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Every form across the plugin uses these semantic colors. Colors match the Settings page
        Feature Gate categories exactly.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {(Object.entries(SECTION_COLORS) as [string, string][]).map(([name, hex]) => (
          <FormSection
            key={name}
            icon={PALETTE_ICONS[name] || 'mdi:circle'}
            title={PALETTE_TITLES[name] || name}
            color={name}
            noGrid
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Chip
                label={name}
                size="small"
                sx={{ bgcolor: hex, color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}
              />
              <Typography variant="body2" color="text.secondary">
                {hex}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {PALETTE_USAGE[name]}
              </Typography>
            </Box>
          </FormSection>
        ))}
      </Box>
    </StoryWrapper>
  );
}

const PALETTE_ICONS: Record<string, string> = {
  storage: 'mdi:harddisk',
  network: 'mdi:lan',
  compute: 'mdi:cpu-64-bit',
  device: 'mdi:expansion-card',
  security: 'mdi:shield-lock',
  migration: 'mdi:airplane',
  display: 'mdi:monitor',
  other: 'mdi:information-outline',
};

const PALETTE_TITLES: Record<string, string> = {
  storage: 'Storage',
  network: 'Network',
  compute: 'Compute',
  device: 'Devices',
  security: 'Security',
  migration: 'Migration / Scheduling',
  display: 'Display',
  other: 'Basic Information / Other',
};

const PALETTE_USAGE: Record<string, string> = {
  storage: 'Disks, volumes, DataSources, exports, snapshots',
  network: 'Network interfaces, NADs, IPAM, bridges',
  compute: 'CPU, memory, resources, limits',
  device: 'GPU, USB, host devices, firmware',
  security: 'SELinux, seccomp, encryption, auth',
  migration: 'Scheduling, TTL, garbage collection, migration config',
  display: 'VNC, video config, display type',
  other: 'Name, namespace, labels, annotations',
};

// ----- Story 2: Realistic Form Template -----

function RealisticFormTemplate() {
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState('default');
  const [sourceKind, setSourceKind] = useState('VirtualMachine');
  const [sourceName, setSourceName] = useState('');
  const [cpuCores, setCpuCores] = useState(2);
  const [memoryGi, setMemoryGi] = useState(4);
  const [networkType, setNetworkType] = useState('bridge');
  const [vlanId, setVlanId] = useState('');
  const [secureExec, setSecureExec] = useState(false);
  const [ttl, setTtl] = useState('1h');

  return (
    <StoryWrapper>
      <Typography variant="h5" gutterBottom>
        Form Template (all section types)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This demonstrates every FormSection color in a realistic form layout. No form in the plugin
        will have all of these — this is a showcase of what's available.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Basic Info — other (brown) */}
        <FormSection icon="mdi:information-outline" title="Basic Information" color="other" noGrid>
          <TextField
            fullWidth
            label="Name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            helperText="Unique resource name"
            sx={{ mb: 2 }}
          />
          <Autocomplete
            fullWidth
            options={['default', 'kubevirt', 'production', 'staging']}
            value={namespace}
            onChange={(_, v) => setNamespace(v || 'default')}
            renderInput={params => <TextField {...params} label="Namespace" required />}
          />
        </FormSection>

        <Divider />

        {/* Storage — storage (orange) */}
        <FormSection icon="mdi:harddisk" title="Storage Source" color="storage" noGrid>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel>Source Kind</FormLabel>
            <RadioGroup value={sourceKind} onChange={e => setSourceKind(e.target.value)}>
              <FormControlLabel
                value="VirtualMachine"
                control={<Radio />}
                label="Virtual Machine"
              />
              <FormControlLabel value="PersistentVolumeClaim" control={<Radio />} label="PVC" />
              <FormControlLabel
                value="VirtualMachineSnapshot"
                control={<Radio />}
                label="VM Snapshot"
              />
            </RadioGroup>
          </FormControl>
          <Autocomplete
            fullWidth
            options={['my-vm-1', 'web-server', 'database']}
            value={sourceName || null}
            onChange={(_, v) => setSourceName(v || '')}
            renderInput={params => <TextField {...params} label={`${sourceKind} Name`} required />}
          />
        </FormSection>

        <Divider />

        {/* Compute — compute (purple) */}
        <FormSection icon="mdi:cpu-64-bit" title="CPU & Memory" color="compute">
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" gutterBottom>
              CPU Cores: {cpuCores}
            </Typography>
            <Slider
              value={cpuCores}
              onChange={(_, v) => setCpuCores(v as number)}
              min={1}
              max={16}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" gutterBottom>
              Memory (GiB): {memoryGi}
            </Typography>
            <Slider
              value={memoryGi}
              onChange={(_, v) => setMemoryGi(v as number)}
              min={1}
              max={64}
              step={1}
              valueLabelDisplay="auto"
            />
          </Grid>
        </FormSection>

        <Divider />

        {/* Network — network (blue) */}
        <FormSection icon="mdi:lan" title="Network Configuration" color="network" noGrid>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel>Network Type</FormLabel>
            <RadioGroup row value={networkType} onChange={e => setNetworkType(e.target.value)}>
              <FormControlLabel value="bridge" control={<Radio size="small" />} label="Bridge" />
              <FormControlLabel value="macvlan" control={<Radio size="small" />} label="Macvlan" />
              <FormControlLabel value="sriov" control={<Radio size="small" />} label="SR-IOV" />
            </RadioGroup>
          </FormControl>
          <TextField
            fullWidth
            label="VLAN ID"
            value={vlanId}
            onChange={e => setVlanId(e.target.value)}
            placeholder="Optional"
            helperText="Leave empty for untagged"
          />
        </FormSection>

        <Divider />

        {/* Device — device (green) */}
        <FormSection icon="mdi:expansion-card" title="Devices" color="device" noGrid>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {['GPU Passthrough', 'USB Controller', 'Virtio RNG', 'Watchdog'].map(dev => (
              <Chip key={dev} label={dev} variant="outlined" />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Select host devices to pass through to the VM
          </Typography>
        </FormSection>

        <Divider />

        {/* Security — security (red) */}
        <FormSection icon="mdi:shield-lock" title="Security" color="security" noGrid>
          <FormControlLabel
            control={<Switch checked={secureExec} onChange={(_, c) => setSecureExec(c)} />}
            label="Enable AMD SEV memory encryption"
          />
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Requires compatible hardware and WorkloadEncryptionSEV feature gate
          </Typography>
        </FormSection>

        <Divider />

        {/* Migration — migration (cyan) */}
        <FormSection icon="mdi:timer-outline" title="TTL / Scheduling" color="migration" noGrid>
          <RadioGroup value={ttl} onChange={e => setTtl(e.target.value)}>
            {['30m', '1h', '2h', '6h', '24h'].map(v => (
              <FormControlLabel key={v} value={v} control={<Radio size="small" />} label={v} />
            ))}
          </RadioGroup>
        </FormSection>

        <Divider />

        {/* Display — display (slate) */}
        <FormSection icon="mdi:monitor" title="Display" color="display" noGrid>
          <FormControl component="fieldset">
            <FormLabel>Video Device</FormLabel>
            <RadioGroup row defaultValue="virtio">
              <FormControlLabel value="virtio" control={<Radio size="small" />} label="VirtIO" />
              <FormControlLabel value="vga" control={<Radio size="small" />} label="VGA" />
              <FormControlLabel value="bochs" control={<Radio size="small" />} label="Bochs" />
            </RadioGroup>
          </FormControl>
        </FormSection>
      </Box>
    </StoryWrapper>
  );
}

// ----- Story 3: Create Button + Form Dialog Flow -----

function CreateButtonShowcase() {
  return (
    <StoryWrapper>
      <Typography variant="h5" gutterBottom>
        Create Button Variants
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Every list page has this split button. "Form" opens the form dialog, "YAML" opens the editor
        tab.
      </Typography>

      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <CreateButtonWithMode
          label="Create VM"
          onCreateForm={() => alert('Open VM form')}
          onCreateYAML={() => alert('Open YAML editor')}
        />
        <CreateButtonWithMode
          label="Create Export"
          onCreateForm={() => alert('Open Export form')}
          onCreateYAML={() => alert('Open YAML editor')}
        />
        <CreateButtonWithMode
          label="Create Network"
          onCreateForm={() => alert('Open NAD form')}
          onCreateYAML={() => alert('Open YAML editor')}
        />
        <CreateButtonWithMode
          label="Create Instance Type"
          onCreateForm={() => alert('Open InstanceType form')}
          onCreateYAML={() => alert('Open YAML editor')}
        />
      </Box>
    </StoryWrapper>
  );
}

// ----- Story 4: No Color (plain) -----

function PlainSections() {
  return (
    <StoryWrapper>
      <Typography variant="h5" gutterBottom>
        Plain FormSection (no color)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Without the color prop, FormSection renders as a neutral outlined Paper.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <FormSection icon="mdi:information-outline" title="Section Without Color" noGrid>
          <TextField fullWidth label="Example Field" />
        </FormSection>
        <FormSection icon="mdi:information-outline" title="Section With Grid (3 cols)" columns={12}>
          <Grid item xs={4}>
            <TextField fullWidth label="Field A" />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth label="Field B" />
          </Grid>
          <Grid item xs={4}>
            <TextField fullWidth label="Field C" />
          </Grid>
        </FormSection>
      </Box>
    </StoryWrapper>
  );
}

// ----- Meta -----

export default {
  title: 'KubeVirt/Templates/FormSection',
  component: FormSection,
} as Meta;

export const ColorPalette: StoryFn = () => <ColorPaletteShowcase />;
ColorPalette.storyName = 'Color Palette Reference';

export const RealisticForm: StoryFn = () => <RealisticFormTemplate />;
RealisticForm.storyName = 'Realistic Form (all sections)';

export const CreateButtons: StoryFn = () => <CreateButtonShowcase />;
CreateButtons.storyName = 'Create Button Variants';

export const Plain: StoryFn = () => <PlainSections />;
Plain.storyName = 'Plain (no color)';
