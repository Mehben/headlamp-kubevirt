import { Icon } from '@iconify/react';
import { Link, Resource } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Card, CardContent, Chip, Grid, IconButton, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { KubeCondition } from '../../types';
import CreateResourceDialog from '../common/CreateResourceDialog';
import DataSource from './DataSource';
import DataSourceForm from './DataSourceForm';

export default function DataSourceDetails() {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const [dataSource] = DataSource.useGet(name, namespace);
  const [editOpen, setEditOpen] = useState(false);

  if (!dataSource) {
    return null;
  }

  return (
    <>
      <Resource.DetailsGrid
        resourceType={DataSource}
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
                <Typography variant="body1">{dataSource.getName()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Namespace
                </Typography>
                <Typography variant="body1">{dataSource.getNamespace()}</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Status
                </Typography>
                <Box sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {(() => {
                    const conditions = dataSource.status?.conditions || [];
                    const readyCondition = conditions.find(
                      (c: KubeCondition) => c.type === 'Ready'
                    );
                    const runningCondition = conditions.find(
                      (c: KubeCondition) => c.type === 'Running'
                    );

                    if (readyCondition?.status === 'True') {
                      return <Chip label="Ready" size="small" color="success" />;
                    } else if (runningCondition?.status === 'True') {
                      return (
                        <Chip
                          label="Running"
                          size="small"
                          color="info"
                          icon={<Icon icon="mdi:sync" />}
                        />
                      );
                    } else if (
                      readyCondition?.reason === 'Pending' ||
                      readyCondition?.reason === 'Progressing'
                    ) {
                      return (
                        <Chip
                          label={readyCondition.reason}
                          size="small"
                          color="warning"
                          icon={<Icon icon="mdi:clock-outline" />}
                        />
                      );
                    } else if (readyCondition?.status === 'False') {
                      return (
                        <Chip
                          label="Error"
                          size="small"
                          color="error"
                          icon={<Icon icon="mdi:alert-circle" />}
                        />
                      );
                    }
                    return <Chip label="Unknown" size="small" color="default" />;
                  })()}
                </Box>
              </Box>

              {!dataSource.isReady() && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Message
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {dataSource.getReadyMessage()}
                  </Typography>
                </Box>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Operating System
                </Typography>
                <Typography variant="body1">{dataSource.getOperatingSystem()}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Instance Configuration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:shape" />
                <Typography variant="h6">Instance Configuration</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Default Instance Type
                </Typography>
                {dataSource.getInstanceType() !== '-' ? (
                  <Box sx={{ display: 'block' }}>
                    <Link routeName="instancetype" params={{ name: dataSource.getInstanceType() }}>
                      {dataSource.getInstanceType()}
                    </Link>
                  </Box>
                ) : (
                  <Typography variant="body1">-</Typography>
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Default Preference
                </Typography>
                {dataSource.getPreference() !== '-' ? (
                  <Box sx={{ display: 'block' }}>
                    <Link routeName="preference" params={{ name: dataSource.getPreference() }}>
                      {dataSource.getPreference()}
                    </Link>
                  </Box>
                ) : (
                  <Typography variant="body1">-</Typography>
                )}
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1">{dataSource.getDescription()}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Source Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:database" />
                <Typography variant="h6">Source Information</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Source PVC
                </Typography>
                {dataSource.getSourcePVCName() !== '-' ? (
                  <Box sx={{ display: 'block' }}>
                    <Link
                      routeName="persistentvolumeclaim"
                      params={{
                        name: dataSource.getSourcePVCName(),
                        namespace: dataSource.getSourcePVCNamespace(),
                      }}
                    >
                      {dataSource.getSourcePVCNamespace()}/{dataSource.getSourcePVCName()}
                    </Link>
                  </Box>
                ) : (
                  <Typography variant="body1">-</Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* DataImportCron Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Icon icon="mdi:calendar-sync" />
                <Typography variant="h6">Automatic Updates</Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 0.5 }}
                >
                  Managed by DataImportCron
                </Typography>
                {dataSource.getDataImportCron() !== '-' ? (
                  <Box sx={{ display: 'block' }}>
                    <Link
                      routeName="dataimportcron"
                      params={{
                        name: dataSource.getDataImportCron(),
                        namespace: dataSource.getNamespace(),
                      }}
                    >
                      {dataSource.getDataImportCron()}
                    </Link>
                  </Box>
                ) : (
                  <Typography variant="body1">Not managed</Typography>
                )}
              </Box>

              {dataSource.getDataImportCron() !== '-' && (
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    This DataSource is automatically updated by a DataImportCron schedule. New
                    versions will be imported periodically.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Conditions */}
        {dataSource.status?.conditions && dataSource.status.conditions.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Icon icon="mdi:format-list-checks" />
                  <Typography variant="h6">Conditions</Typography>
                </Box>

                {dataSource.status.conditions.map((condition: KubeCondition, index: number) => (
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
        title="Edit DataSource"
        resourceClass={DataSource}
        initialResource={dataSource.jsonData}
        editMode
        formComponent={DataSourceForm}
      />
    </>
  );
}
