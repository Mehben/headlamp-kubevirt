import { ActionButton } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link, Resource } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip } from '@mui/material';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import VMConsole from '../VMConsole/VMConsole';
import VirtualMachineInstance from './VirtualMachineInstance';

export default function VirtualMachineInstanceDetails() {
  const params = useParams<{ namespace: string; name: string }>();
  const { name, namespace } = params;
  const [showConsole, setShowConsole] = useState(false);
  const [consoleTab, setConsoleTab] = useState<'vnc' | 'terminal'>('terminal');

  return (
    <Resource.DetailsGrid
      name={name}
      namespace={namespace}
      resourceType={VirtualMachineInstance}
      extraInfo={item =>
        item && [
          {
            name: 'Phase',
            value: (
              <Chip
                label={item.status?.phase || 'Unknown'}
                size="small"
                color={item.status?.phase === 'Running' ? 'success' : 'default'}
              />
            ),
          },
          {
            name: 'Virtual Machine',
            value: (
              <Link
                routeName="virtualmachine"
                params={{
                  name: item.getName(),
                  namespace: item.getNamespace(),
                }}
              >
                {item.getName()}
              </Link>
            ),
          },
          {
            name: 'Node',
            value: item.status?.nodeName ? (
              <Link routeName="node" params={{ name: item.status.nodeName }}>
                {item.status.nodeName}
              </Link>
            ) : (
              '-'
            ),
          },
          {
            name: 'IP Addresses',
            value: (() => {
              const interfaces = item.status?.interfaces || [];
              const ips: string[] = [];
              interfaces.forEach((iface: { ipAddresses?: string[] }) => {
                if (iface.ipAddresses) {
                  iface.ipAddresses.forEach((ip: string) => {
                    if (!ip.startsWith('fe80::') && !ips.includes(ip)) {
                      ips.push(ip);
                    }
                  });
                }
              });
              return ips.length > 0 ? (
                <Box display="flex" gap={0.5} flexWrap="wrap">
                  {ips.map(ip => (
                    <Chip
                      key={ip}
                      label={ip}
                      size="small"
                      variant="outlined"
                      sx={{ fontFamily: 'monospace' }}
                    />
                  ))}
                </Box>
              ) : (
                '-'
              );
            })(),
          },
          {
            name: 'Guest OS',
            value: item.status?.guestOSInfo?.prettyName || item.status?.guestOSInfo?.name || '-',
          },
        ]
      }
      extraSections={item =>
        item && [
          {
            id: 'headlamp.vmi-conditions',
            section: <Resource.ConditionsSection resource={item?.jsonData} />,
          },
          {
            id: 'headlamp.vmi-console',
            section: (
              <VMConsole
                open={showConsole}
                item={item}
                initialTab={consoleTab}
                onClose={() => setShowConsole(false)}
              />
            ),
          },
        ]
      }
      actions={item =>
        item && [
          {
            id: 'terminal',
            action: (
              <Resource.AuthVisible item={item} authVerb="get" subresource="console">
                <ActionButton
                  description="Serial Console"
                  icon="mdi:console"
                  onClick={() => {
                    setConsoleTab('terminal');
                    setShowConsole(true);
                  }}
                />
              </Resource.AuthVisible>
            ),
          },
          {
            id: 'vnc',
            action: (
              <Resource.AuthVisible item={item} authVerb="get" subresource="vnc">
                <ActionButton
                  description="VNC Console"
                  icon="mdi:monitor"
                  onClick={() => {
                    setConsoleTab('vnc');
                    setShowConsole(true);
                  }}
                />
              </Resource.AuthVisible>
            ),
          },
        ]
      }
    />
  );
}
