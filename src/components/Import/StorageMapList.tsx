import { Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { DateLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Chip } from '@mui/material';
import React from 'react';
import useFilteredList from '../../hooks/useFilteredList';
import ForkliftStorageMap from './ForkliftStorageMap';

export default function StorageMapList() {
  const { items: rawItems } = ForkliftStorageMap.useList();
  const items = useFilteredList(rawItems);

  const columns = [
    { id: 'name', header: 'Name', accessorFn: (m: ForkliftStorageMap) => m.getName() },
    {
      id: 'namespace',
      header: 'Namespace',
      accessorFn: (m: ForkliftStorageMap) => m.getNamespace(),
    },
    {
      id: 'source',
      header: 'Source Provider',
      accessorFn: (m: ForkliftStorageMap) => m.getSourceProvider(),
    },
    {
      id: 'destination',
      header: 'Destination',
      accessorFn: (m: ForkliftStorageMap) => m.getDestinationProvider(),
    },
    {
      id: 'mappings',
      header: 'Mappings',
      accessorFn: (m: ForkliftStorageMap) => String(m.getMappingCount()),
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (m: ForkliftStorageMap) => (m.isReady() ? 'Ready' : 'Not Ready'),
      Cell: ({ row }: { row: { original: ForkliftStorageMap } }) => (
        <Chip
          label={row.original.isReady() ? 'Ready' : 'Not Ready'}
          color={row.original.isReady() ? 'success' : 'warning'}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'age',
      header: 'Age',
      accessorFn: (m: ForkliftStorageMap) => m.metadata?.creationTimestamp || '',
      Cell: ({ row }: { row: { original: ForkliftStorageMap } }) => {
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
      getRowId={(m: ForkliftStorageMap) => m.metadata?.uid ?? m.getName()}
    />
  );
}
