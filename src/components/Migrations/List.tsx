import { Link, Resource } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip, Typography } from '@mui/material';
import VirtualMachineInstanceMigration from './VirtualMachineInstanceMigration';

export default function MigrationList() {
  const { items, errors } = VirtualMachineInstanceMigration.useList();

  // Check if there are no migrations
  const hasMigrations = items && items.length > 0;

  if (!hasMigrations && !errors) {
    return (
      <Box
        sx={{
          p: 4,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          No VM Migrations Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600 }}>
          There are currently no active or recent VM migrations. Migrations allow you to move
          running virtual machines between nodes without downtime.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          To migrate a VM, use the "Migrate" action from the Virtual Machines list or details page.
        </Typography>
      </Box>
    );
  }

  return (
    <Resource.ResourceListView
      title="VM Migrations"
      data={items}
      columns={[
        {
          id: 'name',
          label: 'Migration Name',
          getValue: migration => migration.getName(),
          render: migration => (
            <Link
              routeName="/kubevirt/migrations/:namespace/:name"
              params={{ name: migration.getName(), namespace: migration.getNamespace() }}
            >
              {migration.getName()}
            </Link>
          ),
        },
        {
          id: 'vmi',
          label: 'Virtual Machine',
          getValue: migration => migration.getVMIName(),
          render: migration => (
            <Link
              routeName="/kubevirt/virtualmachines/:namespace/:name"
              params={{
                name: migration.getVMIName(),
                namespace: migration.getNamespace(),
              }}
            >
              {migration.getVMIName()}
            </Link>
          ),
        },
        {
          id: 'source',
          label: 'Source Node',
          getValue: migration => migration.getSourceNode(),
        },
        {
          id: 'target',
          label: 'Target Node',
          getValue: migration => migration.getTargetNode(),
        },
        {
          id: 'phase',
          label: 'Status',
          getValue: migration => migration.getPhase(),
          render: migration => {
            const phase = migration.getPhase();
            let color: 'default' | 'primary' | 'success' | 'error' | 'warning' = 'default';

            if (phase === 'Succeeded') {
              color = 'success';
            } else if (phase === 'Failed') {
              color = 'error';
            } else if (phase === 'Running' || phase === 'Scheduling') {
              color = 'primary';
            } else if (phase === 'Pending') {
              color = 'warning';
            }

            return <Chip label={phase} color={color} size="small" />;
          },
        },
        {
          id: 'started',
          label: 'Started',
          getValue: migration => migration.getStartTime(),
        },
        'age',
      ]}
    />
  );
}
