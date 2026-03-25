import { Icon } from '@iconify/react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import VirtualMachine from './VirtualMachine';

interface BulkConfirmDialogProps {
  action: string;
  actionLabel: string;
  vms: VirtualMachine[];
  onConfirm: () => void;
  onCancel: () => void;
}

const actionConfig: Record<string, { icon: string; color: string; description: string }> = {
  start: { icon: 'mdi:play', color: '#4caf50', description: 'start the following VMs' },
  stop: { icon: 'mdi:stop', color: '#ff9800', description: 'gracefully stop the following VMs' },
  forceStop: {
    icon: 'mdi:stop-circle',
    color: '#f44336',
    description: 'force stop the following VMs (immediate power-off)',
  },
  migrate: {
    icon: 'mdi:arrow-decision',
    color: '#2196f3',
    description: 'live migrate the following VMs',
  },
  delete: {
    icon: 'mdi:delete',
    color: '#f44336',
    description: 'permanently delete the following VMs',
  },
};

export default function BulkConfirmDialog({
  action,
  actionLabel,
  vms,
  onConfirm,
  onCancel,
}: BulkConfirmDialogProps) {
  const config = actionConfig[action] || actionConfig.start;

  return (
    <Dialog open onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon icon={config.icon} width={24} color={config.color} />
        {actionLabel} {vms.length} VM{vms.length > 1 ? 's' : ''}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Are you sure you want to {config.description}?
        </Typography>
        <List dense>
          {vms.map(vm => (
            <ListItem key={vm.metadata?.uid}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <Icon icon="mdi:monitor" width={18} />
              </ListItemIcon>
              <ListItemText
                primary={vm.getName()}
                secondary={`${vm.getNamespace()} — ${vm.status?.printableStatus || 'Unknown'}`}
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          color={action === 'delete' || action === 'forceStop' ? 'error' : 'primary'}
          startIcon={<Icon icon={config.icon} />}
        >
          {actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
