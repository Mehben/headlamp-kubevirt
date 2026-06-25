import { Icon } from '@iconify/react';
import { MainInfoSection, SectionBox, Table } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Box, Chip, Grid, Paper, Tab, Tabs, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import {
  getProviderNetworks,
  getProviderStorage,
  getProviderSummary,
  getProviderVMs,
  InventoryNetwork,
  InventoryStorage,
  InventoryVM,
} from '../../utils/forkliftInventory';
import ForkliftProvider from './ForkliftProvider';

export default function ProviderDetails() {
  const hash = window.location.hash || '';
  const match = hash.match(/providers\/([^/]+)\/([^/?]+)/);
  const namespace = match?.[1] || '';
  const name = match?.[2] || '';
  const [item] = ForkliftProvider.useGet(name, namespace);

  const [tab, setTab] = useState(0);
  const [summary, setSummary] = useState<{
    vmCount: number;
    networkCount: number;
    storageClassCount: number;
  } | null>(null);
  const [vms, setVms] = useState<InventoryVM[] | null>(null);
  const [networks, setNetworks] = useState<InventoryNetwork[] | null>(null);
  const [storage, setStorage] = useState<InventoryStorage[] | null>(null);

  // Fetch inventory data when provider is loaded
  useEffect(() => {
    if (!item || !item.isReady()) return;
    const uid = item.metadata?.uid;
    const type = item.getType();
    if (!uid) return;

    getProviderSummary(type, uid).then(setSummary);
  }, [item]);

  // Fetch tab-specific data lazily
  useEffect(() => {
    if (!item || !item.isReady()) return;
    const uid = item.metadata?.uid;
    const type = item.getType();
    if (!uid) return;

    if (tab === 1 && vms === null) getProviderVMs(type, uid).then(setVms);
    if (tab === 2 && networks === null) getProviderNetworks(type, uid).then(setNetworks);
    if (tab === 3 && storage === null) getProviderStorage(type, uid).then(setStorage);
  }, [tab, item, vms, networks, storage]);

  if (!item) {
    return (
      <Box p={4} textAlign="center">
        <Typography>Loading provider...</Typography>
      </Box>
    );
  }

  const typeMeta = item.getTypeMeta();
  const conditions = item.status?.conditions || [];

  return (
    <>
      <MainInfoSection
        resource={item}
        extraInfo={[
          {
            name: 'Type',
            value: (
              <Box display="flex" alignItems="center" gap={0.5}>
                <Icon icon={typeMeta.icon} width={18} color={typeMeta.color} />
                {typeMeta.label}
              </Box>
            ),
          },
          { name: 'Endpoint', value: item.getUrl() || '(local cluster)' },
          { name: 'Secret', value: item.getSecretName() || '-' },
          {
            name: 'Status',
            value: (
              <Chip
                label={item.isReady() ? 'Ready' : 'Not Ready'}
                color={item.isReady() ? 'success' : 'warning'}
                size="small"
              />
            ),
          },
          ...(summary
            ? [
                { name: 'VMs', value: String(summary.vmCount) },
                { name: 'Networks', value: String(summary.networkCount) },
                { name: 'Storage Classes', value: String(summary.storageClassCount) },
              ]
            : []),
        ]}
      />

      <SectionBox title="">
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab
            label="Conditions"
            icon={<Icon icon="mdi:check-circle" width={16} />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab
            label={`VMs${summary ? ` (${summary.vmCount})` : ''}`}
            icon={<Icon icon="mdi:desktop-classic" width={16} />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
            disabled={!item.isReady()}
          />
          <Tab
            label={`Networks${summary ? ` (${summary.networkCount})` : ''}`}
            icon={<Icon icon="mdi:lan" width={16} />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
            disabled={!item.isReady()}
          />
          <Tab
            label={`Storage${summary ? ` (${summary.storageClassCount})` : ''}`}
            icon={<Icon icon="mdi:harddisk" width={16} />}
            iconPosition="start"
            sx={{ textTransform: 'none' }}
            disabled={!item.isReady()}
          />
        </Tabs>

        {/* Conditions tab */}
        {tab === 0 && (
          <Grid container spacing={2}>
            {conditions.map(
              (
                c: {
                  type: string;
                  status: string;
                  message: string;
                  reason: string;
                  category: string;
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
                      <Chip
                        label={c.category}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 'auto' }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {c.message}
                    </Typography>
                  </Paper>
                </Grid>
              )
            )}
          </Grid>
        )}

        {/* VMs tab */}
        {tab === 1 && (
          <Table
            columns={[
              { id: 'name', header: 'Name', accessorFn: (vm: InventoryVM) => vm.name || '-' },
              {
                id: 'namespace',
                header: 'Namespace',
                accessorFn: (vm: InventoryVM) => vm.namespace || '-',
              },
              { id: 'id', header: 'ID', accessorFn: (vm: InventoryVM) => vm.id || '-' },
            ]}
            data={vms ?? []}
            loading={vms === null}
            enableRowSelection={false}
            getRowId={(vm: InventoryVM) => vm.id || vm.name}
          />
        )}

        {/* Networks tab */}
        {tab === 2 && (
          <Table
            columns={[
              { id: 'name', header: 'Name', accessorFn: (n: InventoryNetwork) => n.name || '-' },
              {
                id: 'namespace',
                header: 'Namespace',
                accessorFn: (n: InventoryNetwork) => n.namespace || '-',
              },
              { id: 'id', header: 'ID', accessorFn: (n: InventoryNetwork) => n.id || '-' },
            ]}
            data={networks ?? []}
            loading={networks === null}
            enableRowSelection={false}
            getRowId={(n: InventoryNetwork) => n.id || n.name}
          />
        )}

        {/* Storage tab */}
        {tab === 3 && (
          <Table
            columns={[
              { id: 'name', header: 'Name', accessorFn: (s: InventoryStorage) => s.name || '-' },
              { id: 'id', header: 'ID', accessorFn: (s: InventoryStorage) => s.id || '-' },
            ]}
            data={storage ?? []}
            loading={storage === null}
            enableRowSelection={false}
            getRowId={(s: InventoryStorage) => s.id || s.name}
          />
        )}
      </SectionBox>
    </>
  );
}
