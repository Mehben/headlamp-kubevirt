import { Icon } from '@iconify/react';
import { Resource } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { KubeCondition } from '../../types';
import CreateResourceDialog from '../common/CreateResourceDialog';
import DataVolume from './DataVolume';
import ImportVolumeForm from './ImportVolumeForm';

export default function DataVolumeDetails() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const [dv] = DataVolume.useGet(name, namespace);
  const [editOpen, setEditOpen] = useState(false);

  if (!dv) {
    return null;
  }

  const renderSourceDetails = () => {
    const sourceSpec = dv.spec?.source;
    if (!sourceSpec) return null;

    if (sourceSpec.http) {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            HTTP Source
          </Typography>
          <Typography variant="caption" color="text.secondary">
            URL:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {sourceSpec.http.url}
          </Typography>
        </Box>
      );
    } else if (sourceSpec.registry) {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            Registry Source
          </Typography>
          <Typography variant="caption" color="text.secondary">
            URL:
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {sourceSpec.registry.url}
          </Typography>
        </Box>
      );
    } else if (sourceSpec.pvc) {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            Clone PVC Source
          </Typography>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Name:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {sourceSpec.pvc.name}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Namespace:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {sourceSpec.pvc.namespace}
            </Typography>
          </Box>
        </Box>
      );
    } else if (sourceSpec.snapshot) {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            Snapshot Source
          </Typography>
          <Box sx={{ mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Name:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {sourceSpec.snapshot.name}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Namespace:
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
              {sourceSpec.snapshot.namespace}
            </Typography>
          </Box>
        </Box>
      );
    } else if (sourceSpec.upload) {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            Upload Source
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ready for upload via virtctl image-upload
          </Typography>
        </Box>
      );
    } else if (sourceSpec.blank) {
      return (
        <Box>
          <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
            Blank Volume
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Empty disk
          </Typography>
        </Box>
      );
    }

    return null;
  };

  return (
    <>
      <Resource.DetailsGrid
        resourceType={DataVolume}
        name={name}
        namespace={namespace}
        withEvents
        actions={[
          <Tooltip title="Edit with Wizard">
            <IconButton key="edit-wizard" onClick={() => setEditOpen(true)} size="small">
              <Icon icon="mdi:auto-fix" />
            </IconButton>
          </Tooltip>,
        ]}
      />

      <Grid container spacing={3} sx={{ mt: 2, px: 2 }}>
        {/* Upload Instructions (if applicable) */}
        {dv.spec?.source?.upload && (
          <Grid item xs={12}>
            <Alert severity="info" icon={<Icon icon="mdi:upload" />}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Ready for Upload:</strong> This DataVolume is waiting for a file upload.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Use the following command to upload your disk image:
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  whiteSpace: 'pre-wrap',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                {`virtctl image-upload dv ${name} \\\n  --namespace ${namespace} \\\n  --no-create \\\n  --image-path=/path/to/disk.img \\\n  --insecure`}
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Replace <code>/path/to/disk.img</code> with the path to your local disk image (ISO,
                qcow2, raw, etc.).
              </Typography>
            </Alert>
          </Grid>
        )}

        {/* Summary */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:information-outline" />
                <Typography variant="h6">Summary</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Source Type
                </Typography>
                <Typography variant="body1">{dv.getSourceType()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Size
                </Typography>
                <Typography variant="body1">{dv.getSize()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Storage Class
                </Typography>
                <Typography variant="body1">{dv.getStorageClass()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Content Type
                </Typography>
                <Typography variant="body1">{dv.getContentType()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Phase
                </Typography>
                <Chip
                  label={dv.status?.phase || 'Unknown'}
                  size="small"
                  color={dv.status?.phase === 'Succeeded' ? 'success' : 'default'}
                />
              </Box>

              {dv.status?.progress && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Progress
                  </Typography>
                  <Typography variant="body1">{dv.status.progress}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Source Details */}
        {dv.spec?.source && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Icon icon="mdi:database" />
                  <Typography variant="h6">Source Details</Typography>
                </Box>

                {renderSourceDetails()}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Conditions */}
        {dv.status?.conditions && dv.status.conditions.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Icon icon="mdi:check-circle-outline" />
                  <Typography variant="h6">Conditions</Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {dv.status.conditions.map((condition: KubeCondition, idx: number) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 2,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        bgcolor: condition.status === 'True' ? 'success.light' : 'action.hover',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold">
                          {condition.type}
                        </Typography>
                        <Chip
                          label={condition.status}
                          size="small"
                          color={condition.status === 'True' ? 'success' : 'default'}
                        />
                      </Box>
                      {condition.reason && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                          sx={{ mb: 0.5 }}
                        >
                          Reason: {condition.reason}
                        </Typography>
                      )}
                      {condition.message && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {condition.message}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <CreateResourceDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit DataVolume"
        resourceClass={DataVolume}
        initialResource={dv.jsonData}
        editMode
        formComponent={ImportVolumeForm}
      />
    </>
  );
}
