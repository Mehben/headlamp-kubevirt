import { Link, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { DateLabel } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Chip } from '@mui/material';
import React from 'react';
import useFilteredList from '../../hooks/useFilteredList';
import ForkliftPlan from './ForkliftPlan';

export default function PlanList() {
  const { items: rawItems } = ForkliftPlan.useList();
  const items = useFilteredList(rawItems);

  const columns = [
    {
      id: 'name',
      header: 'Name',
      accessorFn: (p: ForkliftPlan) => p.getName(),
      Cell: ({ row }: { row: { original: ForkliftPlan } }) => (
        <Link
          routeName="forklift-plan"
          params={{
            name: row.original.getName(),
            namespace: row.original.getNamespace(),
          }}
        >
          {row.original.getName()}
        </Link>
      ),
    },
    { id: 'namespace', header: 'Namespace', accessorFn: (p: ForkliftPlan) => p.getNamespace() },
    { id: 'source', header: 'Source', accessorFn: (p: ForkliftPlan) => p.getSourceProvider() },
    { id: 'target', header: 'Target', accessorFn: (p: ForkliftPlan) => p.getDestinationProvider() },
    { id: 'vms', header: 'VMs', accessorFn: (p: ForkliftPlan) => String(p.getVMCount()) },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (p: ForkliftPlan) => p.getStatusText(),
      Cell: ({ row }: { row: { original: ForkliftPlan } }) => (
        <Chip
          label={row.original.getStatusText()}
          color={row.original.getStatusColor()}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      id: 'age',
      header: 'Age',
      accessorFn: (p: ForkliftPlan) => p.metadata?.creationTimestamp || '',
      Cell: ({ row }: { row: { original: ForkliftPlan } }) => {
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
      getRowId={(p: ForkliftPlan) => p.metadata?.uid ?? p.getName()}
    />
  );
}
