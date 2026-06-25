import { Icon } from '@iconify/react';
import { Link, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { DateLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip } from '@mui/material';
import React from 'react';
import useFilteredList from '../../hooks/useFilteredList';
import ForkliftProvider from './ForkliftProvider';

export default function ProviderList() {
  const { items: rawItems } = ForkliftProvider.useList();
  const items = useFilteredList(rawItems);

  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (p: ForkliftProvider) => p.getName(),
      Cell: ({ row }: { row: { original: ForkliftProvider } }) => (
        <Link
          routeName="forklift-provider"
          params={{
            name: row.original.getName(),
            namespace: row.original.getNamespace(),
          }}
        >
          {row.original.getName()}
        </Link>
      ),
    },
    {
      id: 'namespace',
      header: 'Namespace',
      accessorFn: (p: ForkliftProvider) => p.getNamespace(),
    },
    {
      id: 'type',
      header: 'Type',
      accessorFn: (p: ForkliftProvider) => p.getType(),
      Cell: ({ row }: { row: { original: ForkliftProvider } }) => {
        const meta = row.original.getTypeMeta();
        return (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Icon icon={meta.icon} width={16} color={meta.color} />
            <span>{meta.label}</span>
          </Box>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (p: ForkliftProvider) => (p.isReady() ? 'Ready' : 'Not Ready'),
      Cell: ({ row }: { row: { original: ForkliftProvider } }) => {
        const ready = row.original.isReady();
        const connOk = row.original.isConnectionTestSucceeded();
        const invOk = row.original.isInventoryCreated();
        return (
          <Box display="flex" gap={0.5}>
            <Chip
              label={ready ? 'Ready' : 'Not Ready'}
              color={ready ? 'success' : 'warning'}
              size="small"
              variant="outlined"
            />
            {!ready && !connOk && (
              <Chip label="Connection Failed" color="error" size="small" variant="outlined" />
            )}
            {connOk && !invOk && (
              <Chip label="Loading Inventory" color="info" size="small" variant="outlined" />
            )}
          </Box>
        );
      },
    },
    {
      id: 'endpoint',
      header: 'Endpoint',
      accessorFn: (p: ForkliftProvider) => p.getUrl() || '(local)',
    },
    {
      id: 'age',
      header: 'Age',
      accessorFn: (p: ForkliftProvider) => p.metadata?.creationTimestamp || '',
      Cell: ({ row }: { row: { original: ForkliftProvider } }) => {
        const ts = row.original.metadata?.creationTimestamp;
        return ts ? <DateLabel date={ts} /> : '-';
      },
    },
  ];

  return (
    <Table
      columns={columns}
      data={items ?? []}
      loading={items === null}
      enableRowSelection={false}
      getRowId={(p: ForkliftProvider) => p.metadata?.uid ?? p.getName()}
    />
  );
}
