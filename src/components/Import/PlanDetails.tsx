import { Icon } from '@iconify/react';
import { MainInfoSection, SectionBox } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import {
  Box,
  Chip,
  Grid,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import ForkliftPlan from './ForkliftPlan';

interface PipelineStep {
  name: string;
  phase: string;
  progress: { completed: number; total: number };
  started?: string;
  completed?: string;
  error?: { reasons?: string[] };
}

interface MigrationVM {
  id: string;
  name: string;
  namespace?: string;
  phase: string;
  pipeline: PipelineStep[];
  error?: { reasons?: string[] };
  started?: string;
  completed?: string;
}

const PHASE_ICONS: Record<string, { icon: string; color: string }> = {
  Completed: { icon: 'mdi:check-circle', color: '#4caf50' },
  Running: { icon: 'mdi:progress-clock', color: '#2196f3' },
  Pending: { icon: 'mdi:clock-outline', color: '#888' },
  Failed: { icon: 'mdi:alert-circle', color: '#f44336' },
  Canceled: { icon: 'mdi:cancel', color: '#ff9800' },
};

function StepProgress({ step }: { step: PipelineStep }) {
  const phaseInfo = PHASE_ICONS[step.phase] || PHASE_ICONS.Pending;
  const pct =
    step.progress.total > 0
      ? Math.round((step.progress.completed / step.progress.total) * 100)
      : 0;
  const showBar = step.phase === 'Running' && step.progress.total > 1;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Tooltip title={step.phase} arrow>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Icon icon={phaseInfo.icon} width={20} color={phaseInfo.color} />
        </Box>
      </Tooltip>
      <Typography variant="body2" sx={{ minWidth: 160 }}>
        {step.name}
      </Typography>
      {showBar ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ flex: 1, height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" sx={{ minWidth: 45, textAlign: 'right' }}>
            {pct}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ({step.progress.completed}/{step.progress.total} MB)
          </Typography>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          {step.phase === 'Completed'
            ? 'Done'
            : step.phase === 'Running'
            ? 'In progress...'
            : step.phase}
        </Typography>
      )}
      {step.error?.reasons?.length && (
        <Tooltip title={step.error.reasons.join(', ')} arrow>
          <Chip label="Error" size="small" color="error" variant="outlined" />
        </Tooltip>
      )}
    </Box>
  );
}

function VMProgress({ vm }: { vm: MigrationVM }) {
  const phaseInfo = PHASE_ICONS[vm.phase] || PHASE_ICONS.Pending;
  const [expanded, setExpanded] = useState(true);

  // Calculate overall progress across all pipeline steps
  const totalSteps = vm.pipeline.length;
  const completedSteps = vm.pipeline.filter(s => s.phase === 'Completed').length;
  const overallPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5 }}>
      <Box
        display="flex"
        alignItems="center"
        gap={1}
        sx={{ cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}
      >
        <Icon icon={phaseInfo.icon} width={22} color={phaseInfo.color} />
        <Box sx={{ flex: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Icon icon="mdi:desktop-classic" width={16} />
            <Typography variant="body2" fontWeight={600}>
              {vm.name}
            </Typography>
            {vm.namespace && (
              <Typography variant="caption" color="text.secondary">
                ({vm.namespace})
              </Typography>
            )}
            <Chip
              label={vm.phase}
              size="small"
              variant="outlined"
              sx={
                vm.phase === 'Completed'
                  ? { borderColor: '#4caf50', color: '#4caf50' }
                  : vm.phase === 'Running' || vm.phase === 'CopyDisks'
                  ? { borderColor: '#2196f3', color: '#2196f3' }
                  : vm.phase === 'Failed'
                  ? { borderColor: '#f44336', color: '#f44336' }
                  : {}
              }
            />
          </Box>
          {vm.phase !== 'Completed' && vm.phase !== 'Failed' && (
            <LinearProgress
              variant="determinate"
              value={overallPct}
              sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {completedSteps}/{totalSteps} steps
        </Typography>
        <Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} />
      </Box>

      {expanded && (
        <Box sx={{ mt: 1.5, pl: 4 }}>
          {vm.pipeline.map((step, i) => (
            <StepProgress key={i} step={step} />
          ))}
          {vm.error?.reasons?.length && (
            <Box sx={{ mt: 1, p: 1, bgcolor: 'error.main', borderRadius: 1, opacity: 0.15 }}>
              {vm.error.reasons.map((r, i) => (
                <Typography key={i} variant="body2" color="error">
                  {r}
                </Typography>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}

export default function PlanDetails() {
  const hash = window.location.hash || '';
  const match = hash.match(/plans\/([^/]+)\/([^/?]+)/);
  const namespace = match?.[1] || '';
  const name = match?.[2] || '';
  const [item] = ForkliftPlan.useGet(name, namespace);
  const [tab, setTab] = useState(0);

  if (!item) {
    return (
      <Box p={4} textAlign="center">
        <Typography>Loading plan...</Typography>
      </Box>
    );
  }

  const conditions = item.status?.conditions || [];
  const migration = item.status?.migration || {};
  const migrationVMs: MigrationVM[] = migration.vms || [];

  return (
    <>
      <MainInfoSection
        resource={item}
        extraInfo={[
          {
            name: 'Status',
            value: (
              <Chip
                label={item.getStatusText()}
                color={item.getStatusColor()}
                size="small"
              />
            ),
          },
          { name: 'Source', value: item.getSourceProvider() },
          { name: 'Destination', value: item.getDestinationProvider() },
          { name: 'Target Namespace', value: item.getTargetNamespace() || '-' },
          { name: 'VMs', value: String(item.getVMCount()) },
          ...(item.getNetworkMap()
            ? [{ name: 'Network Map', value: item.getNetworkMap() }]
            : []),
          ...(item.getStorageMap()
            ? [{ name: 'Storage Map', value: item.getStorageMap() }]
            : []),
          ...(item.isWarm() ? [{ name: 'Type', value: 'Warm (incremental)' }] : []),
        ]}
      />

      <SectionBox title="">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab
            label="Migration Progress"
            icon={<Icon icon="mdi:progress-clock" width={16} />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab
            label="Conditions"
            icon={<Icon icon="mdi:check-circle" width={16} />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab
            label="VMs"
            icon={<Icon icon="mdi:desktop-classic" width={16} />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
        </Tabs>

        {/* Migration Progress */}
        {tab === 0 && (
          <Box>
            {migrationVMs.length === 0 ? (
              <Box textAlign="center" py={4}>
                <Icon icon="mdi:clock-outline" width={40} color="#888" />
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  {item.isReady() && !item.isExecuting()
                    ? 'Plan is ready. Start a migration to see progress.'
                    : 'No migration data yet.'}
                </Typography>
              </Box>
            ) : (
              migrationVMs.map((vm, i) => <VMProgress key={i} vm={vm} />)
            )}
          </Box>
        )}

        {/* Conditions */}
        {tab === 1 && (
          <Grid container spacing={2}>
            {conditions.map(
              (
                c: {
                  type: string;
                  status: string;
                  message: string;
                  reason: string;
                  category?: string;
                },
                i: number
              ) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Icon
                        icon={c.status === 'True' ? 'mdi:check-circle' : 'mdi:alert-circle'}
                        width={20}
                        color={c.status === 'True' ? '#4caf50' : '#ff9800'}
                      />
                      <Typography variant="subtitle2">{c.type}</Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {c.message || '-'}
                    </Typography>
                  </Paper>
                </Grid>
              )
            )}
          </Grid>
        )}

        {/* VMs list */}
        {tab === 2 && (
          <Box>
            {item.getVMs().map((vm, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  mb: 0.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                }}
              >
                <Icon icon="mdi:desktop-classic" width={18} />
                <Typography variant="body2" fontWeight={500}>
                  {vm.name}
                </Typography>
                {vm.namespace && (
                  <Typography variant="caption" color="text.secondary">
                    ({vm.namespace})
                  </Typography>
                )}
                {/* Show migration status if available */}
                {(() => {
                  const migVM = migrationVMs.find(m => m.id === vm.id || m.name === vm.name);
                  if (!migVM) return null;
                  const phaseInfo = PHASE_ICONS[migVM.phase] || PHASE_ICONS.Pending;
                  return (
                    <>
                      <Box flex={1} />
                      <Icon icon={phaseInfo.icon} width={16} color={phaseInfo.color} />
                      <Typography variant="caption">{migVM.phase}</Typography>
                    </>
                  );
                })()}
              </Box>
            ))}
          </Box>
        )}
      </SectionBox>
    </>
  );
}
