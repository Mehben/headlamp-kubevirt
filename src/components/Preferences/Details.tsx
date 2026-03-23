import { Icon } from '@iconify/react';
import { Resource } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Card, CardContent, Chip, Grid, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import CreateResourceDialog from '../common/CreateResourceDialog';
import { mapIconClass } from './iconMapper';
import PreferenceForm from './PreferenceForm';
import VirtualMachineClusterPreference from './VirtualMachineClusterPreference';

export default function PreferenceDetails() {
  const { name } = useParams<{ name: string }>();
  const [preference] = VirtualMachineClusterPreference.useGet(name);
  const [editOpen, setEditOpen] = useState(false);

  if (!preference) {
    return null;
  }

  return (
    <>
      <Resource.DetailsGrid
        resourceType={VirtualMachineClusterPreference}
        name={name}
        actions={[
          <Tooltip title="Edit with Wizard">
            <IconButton key="edit-wizard" onClick={() => setEditOpen(true)} size="small">
              <Icon icon="mdi:auto-fix" />
            </IconButton>
          </Tooltip>,
        ]}
      />
      <Grid container spacing={3} sx={{ mt: 2, px: 2 }}>
        {/* Overview */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:information-outline" />
                <Typography variant="h6">Overview</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Name
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {preference.getIconClass() !== '-' && (
                    <Icon icon={mapIconClass(preference.getIconClass())} width="24" height="24" />
                  )}
                  <Typography variant="body1">{preference.getName()}</Typography>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Display Name
                </Typography>
                <Typography variant="body1">{preference.getDisplayName()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Vendor
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={preference.getVendor()}
                    size="small"
                    color={preference.isClusterProvided() ? 'primary' : 'default'}
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  OS Type
                </Typography>
                <Typography variant="body1">{preference.getOSType()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Architecture
                </Typography>
                <Typography variant="body1">{preference.getArchitecture()}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Device Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:devices" />
                <Typography variant="h6">Device Preferences</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Preferred Disk Bus
                </Typography>
                <Typography variant="body1">{preference.getPreferredDiskBus()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Preferred Interface Model
                </Typography>
                <Typography variant="body1">{preference.getPreferredInterfaceModel()}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Firmware */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:chip" />
                <Typography variant="h6">Firmware</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  EFI Boot
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={preference.hasPreferredEFI() ? 'Enabled' : 'Disabled'}
                    size="small"
                    color={preference.hasPreferredEFI() ? 'success' : 'default'}
                  />
                </Box>
              </Box>

              {preference.hasPreferredEFI() && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Secure Boot
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={preference.hasSecureBoot() ? 'Enabled' : 'Disabled'}
                      size="small"
                      color={preference.hasSecureBoot() ? 'success' : 'default'}
                      icon={
                        preference.hasSecureBoot() ? <Icon icon="mdi:shield-check" /> : undefined
                      }
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Requirements */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:alert-circle-outline" />
                <Typography variant="h6">Minimum Requirements</Typography>
              </Box>

              {preference.getMinCPU() > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Minimum CPU
                  </Typography>
                  <Typography variant="body1">{preference.getMinCPU()} vCPU</Typography>
                </Box>
              )}

              {preference.getMinMemory() !== '-' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Minimum Memory
                  </Typography>
                  <Typography variant="body1">{preference.getMinMemory()}</Typography>
                </Box>
              )}

              {preference.getMinCPU() === 0 && preference.getMinMemory() === '-' && (
                <Typography variant="body2" color="text.secondary">
                  No minimum requirements specified
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Full Spec */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:code-braces" />
                <Typography variant="h6">Specification</Typography>
              </Box>

              <Box
                component="pre"
                sx={{
                  p: 2,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: 400,
                  fontSize: '0.875rem',
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(preference.spec, null, 2)}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <CreateResourceDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Preference"
        resourceClass={VirtualMachineClusterPreference}
        initialResource={preference.jsonData}
        editMode
        formComponent={PreferenceForm}
      />
    </>
  );
}
