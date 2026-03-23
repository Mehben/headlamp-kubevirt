import { Icon } from '@iconify/react';
import { Link, Resource } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Card, CardContent, Chip, Grid, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DataImportCronImport, KubeCondition } from '../../types';
import CreateResourceDialog from '../common/CreateResourceDialog';
import { parseCronExpression } from './cronUtils';
import DataImportCron from './DataImportCron';
import DataImportCronForm from './DataImportCronForm';

export default function DataImportCronDetails() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const [dataimportcron] = DataImportCron.useGet(name, namespace);
  const [editOpen, setEditOpen] = useState(false);

  if (!dataimportcron) {
    return null;
  }

  const scheduleDescription = parseCronExpression(dataimportcron.getSchedule());

  return (
    <>
      <Resource.DetailsGrid
        resourceType={DataImportCron}
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
                <Typography variant="body1">{dataimportcron.getName()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Namespace
                </Typography>
                <Typography variant="body1">{dataimportcron.getNamespace()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Managed DataSource
                </Typography>
                <Box sx={{ display: 'block' }}>
                  <Link
                    routeName="datasource"
                    params={{
                      name: dataimportcron.getManagedDataSource(),
                      namespace: dataimportcron.getNamespace(),
                    }}
                  >
                    {dataimportcron.getManagedDataSource()}
                  </Link>
                </Box>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={dataimportcron.isUpToDate() ? 'Up to Date' : 'Out of Date'}
                    size="small"
                    color={dataimportcron.isUpToDate() ? 'success' : 'warning'}
                  />
                  {dataimportcron.isProgressing() && (
                    <Chip
                      label="Progressing"
                      size="small"
                      color="info"
                      icon={<Icon icon="mdi:sync" />}
                    />
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Schedule */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:clock-outline" />
                <Typography variant="h6">Schedule</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Cron Expression
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {dataimportcron.getSchedule()}
                </Typography>
              </Box>

              <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Icon icon="mdi:information" />
                  <Typography variant="body2" fontWeight="medium">
                    {scheduleDescription}
                  </Typography>
                </Box>
              </Box>

              {dataimportcron.getLastExecutionTimestamp() !== '-' && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Last Execution
                  </Typography>
                  <Typography variant="body1">
                    {dataimportcron.getLastExecutionTimestamp()}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Source Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:database-import" />
                <Typography variant="h6">Source Configuration</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Source Type
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip label={dataimportcron.getSourceType()} size="small" color="primary" />
                </Box>
              </Box>

              {dataimportcron.getSourceURL() !== '-' && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Source URL
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  >
                    {dataimportcron.getSourceURL()}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Storage Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:harddisk" />
                <Typography variant="h6">Storage Configuration</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Size
                </Typography>
                <Typography variant="body1">{dataimportcron.getStorageSize()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Storage Class
                </Typography>
                <Typography variant="body1">{dataimportcron.getStorageClass()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Access Mode
                </Typography>
                <Typography variant="body1">{dataimportcron.getAccessMode()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Volume Mode
                </Typography>
                <Typography variant="body1">{dataimportcron.getVolumeMode()}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Garbage Collection */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:delete-sweep" />
                <Typography variant="h6">Garbage Collection</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Policy
                </Typography>
                <Typography variant="body1">{dataimportcron.getGarbageCollect()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Imports to Keep
                </Typography>
                <Typography variant="body1">{dataimportcron.getImportsToKeep()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Retention Policy
                </Typography>
                <Typography variant="body1">{dataimportcron.getRetentionPolicy()}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Import Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:import" />
                <Typography variant="h6">Import Status</Typography>
              </Box>

              {dataimportcron.getLastImportedPVC() !== '-' && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    Last Imported PVC
                  </Typography>
                  <Box sx={{ display: 'block' }}>
                    <Link
                      routeName="persistentvolumeclaim"
                      params={{
                        name: dataimportcron.getLastImportedPVC(),
                        namespace: dataimportcron.getNamespace(),
                      }}
                    >
                      {dataimportcron.getLastImportedPVC()}
                    </Link>
                  </Box>
                </Box>
              )}

              {dataimportcron.getCurrentImports().length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    Current Imports
                  </Typography>
                  {dataimportcron
                    .getCurrentImports()
                    .map((imp: DataImportCronImport, index: number) => (
                      <Box
                        key={index}
                        sx={{
                          p: 1.5,
                          mb: 1,
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {imp.DataVolumeName}
                        </Typography>
                        {imp.Digest && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: 'monospace' }}
                          >
                            {imp.Digest}
                          </Typography>
                        )}
                      </Box>
                    ))}
                </Box>
              )}

              {dataimportcron.getLastImportedPVC() === '-' &&
                dataimportcron.getCurrentImports().length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No imports yet
                  </Typography>
                )}
            </CardContent>
          </Card>
        </Grid>

        {/* Conditions */}
        {dataimportcron.getConditions().length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Icon icon="mdi:format-list-checks" />
                  <Typography variant="h6">Conditions</Typography>
                </Box>

                {dataimportcron.getConditions().map((condition: KubeCondition, index: number) => (
                  <Box
                    key={index}
                    sx={{
                      mb: 2,
                      p: 2,
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                      borderLeft: 4,
                      borderColor: condition.status === 'True' ? 'success.main' : 'grey.500',
                    }}
                  >
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" color="text.secondary">
                          Type
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {condition.type}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={2}>
                        <Typography variant="caption" color="text.secondary">
                          Status
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          <Chip
                            label={condition.status}
                            size="small"
                            color={condition.status === 'True' ? 'success' : 'default'}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={7}>
                        <Typography variant="caption" color="text.secondary">
                          Message
                        </Typography>
                        <Typography variant="body2">{condition.message || '-'}</Typography>
                      </Grid>
                      {condition.reason && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary">
                            Reason: {condition.reason}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <CreateResourceDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit DataImportCron"
        resourceClass={DataImportCron}
        initialResource={dataimportcron.jsonData}
        editMode
        formComponent={DataImportCronForm}
      />
    </>
  );
}
