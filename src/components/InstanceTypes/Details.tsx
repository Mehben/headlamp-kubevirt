import { Icon } from '@iconify/react';
import { Resource } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Card, CardContent, Chip, Grid, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import CreateResourceDialog from '../common/CreateResourceDialog';
import InstanceTypeForm from './InstanceTypeForm';
import VirtualMachineClusterInstanceType from './VirtualMachineClusterInstanceType';

export default function InstanceTypeDetails() {
  const { name } = useParams<{ name: string }>();
  const [instanceType] = VirtualMachineClusterInstanceType.useGet(name);
  const [editOpen, setEditOpen] = useState(false);

  if (!instanceType) {
    return null;
  }

  return (
    <>
      <Resource.DetailsGrid
        resourceType={VirtualMachineClusterInstanceType}
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
                <Typography variant="body1">{instanceType.getName()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Display Name
                </Typography>
                <Typography variant="body1">{instanceType.getDisplayName()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Vendor
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={instanceType.getVendor()}
                    size="small"
                    color={instanceType.isClusterProvided() ? 'primary' : 'default'}
                  />
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Class
                </Typography>
                <Typography variant="body1">{instanceType.getClass()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Size
                </Typography>
                <Typography variant="body1">{instanceType.getSize()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Version
                </Typography>
                <Typography variant="body1">{instanceType.getVersion()}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Resources */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:memory" />
                <Typography variant="h6">Resources</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  CPU
                </Typography>
                <Typography variant="h5" color="primary.main">
                  {instanceType.getCPU()} vCPU
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Memory
                </Typography>
                <Typography variant="h5" color="primary.main">
                  {instanceType.getMemory()}
                </Typography>
              </Box>

              {instanceType.getCPUModel() !== '-' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    CPU Model
                  </Typography>
                  <Typography variant="body1">{instanceType.getCPUModel()}</Typography>
                </Box>
              )}

              {instanceType.getDedicatedCPUPlacement() && (
                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={<Icon icon="mdi:cpu-64-bit" />}
                    label="Dedicated CPU Placement"
                    size="small"
                    color="primary"
                  />
                </Box>
              )}

              {instanceType.getIsolateEmulatorThread() && (
                <Box sx={{ mb: 2 }}>
                  <Chip
                    icon={<Icon icon="mdi:shield-check" />}
                    label="Isolated Emulator Thread"
                    size="small"
                    color="primary"
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Description */}
        {instanceType.getDescription() !== '-' && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Icon icon="mdi:text" />
                  <Typography variant="h6">Description</Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                  {instanceType.getDescription()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}

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
                {JSON.stringify(instanceType.spec, null, 2)}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <CreateResourceDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Instance Type"
        resourceClass={VirtualMachineClusterInstanceType}
        initialResource={instanceType.jsonData}
        editMode
        formComponent={InstanceTypeForm}
      />
    </>
  );
}
