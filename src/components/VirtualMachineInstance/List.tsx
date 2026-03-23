import { Link, Resource } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Chip } from '@mui/material';
import VirtualMachineInstance from './VirtualMachineInstance';

export default function VirtualMachineInstanceList() {
  const { items, error } = VirtualMachineInstance.useList();

  return (
    <Resource.ResourceListView
      title="Virtual Machine Instances"
      errorMessage={error?.message || ''}
      columns={[
        {
          id: 'name',
          label: 'Name',
          getValue: (vmi: VirtualMachineInstance) => vmi.getName(),
          render: (vmi: VirtualMachineInstance) => (
            <Link
              routeName="virtualmachineinstance"
              params={{ name: vmi.getName(), namespace: vmi.getNamespace() }}
            >
              {vmi.getName()}
            </Link>
          ),
        },
        'namespace',
        {
          id: 'phase',
          label: 'Phase',
          getValue: (vmi: VirtualMachineInstance) => vmi.status?.phase || 'Unknown',
          render: (vmi: VirtualMachineInstance) => {
            const phase = vmi.status?.phase || 'Unknown';
            const color =
              phase === 'Running'
                ? 'success'
                : phase === 'Succeeded'
                ? 'info'
                : phase === 'Failed'
                ? 'error'
                : 'default';
            return <Chip label={phase} size="small" color={color} />;
          },
        },
        {
          id: 'node',
          label: 'Node',
          getValue: (vmi: VirtualMachineInstance) => vmi.status?.nodeName || '',
          render: (vmi: VirtualMachineInstance) =>
            vmi.status?.nodeName ? (
              <Link routeName="node" params={{ name: vmi.status.nodeName }}>
                {vmi.status.nodeName}
              </Link>
            ) : (
              '-'
            ),
        },
        {
          id: 'ip',
          label: 'IP',
          getValue: (vmi: VirtualMachineInstance) => {
            const interfaces = vmi.status?.interfaces || [];
            for (const iface of interfaces) {
              if (iface.ipAddresses) {
                const ip = iface.ipAddresses.find((addr: string) => !addr.startsWith('fe80::'));
                if (ip) return ip;
              }
            }
            return '';
          },
        },
        'age',
      ]}
      data={items}
      id="headlamp-virtualmachineinstances"
    />
  );
}
