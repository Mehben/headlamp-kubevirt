import { Icon } from '@iconify/react';
import { SectionBox, SectionFilterHeader } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Button, Typography } from '@mui/material';
import React, { useState } from 'react';
import CreateNetworkMapDialog from './CreateNetworkMapDialog';
import CreatePlanDialog from './CreatePlanDialog';
import CreateProviderDialog from './CreateProviderDialog';
import CreateStorageMapDialog from './CreateStorageMapDialog';
import NetworkMapList from './NetworkMapList';
import PlanList from './PlanList';
import ProviderList from './ProviderList';
import StorageMapList from './StorageMapList';

const VIEWS: Record<string, React.ComponentType> = {
  providers: ProviderList,
  plans: PlanList,
  networkmaps: NetworkMapList,
  storagemaps: StorageMapList,
};

const TITLES: Record<string, string> = {
  providers: 'Providers',
  plans: 'Import Plans',
  networkmaps: 'Network Mappings',
  storagemaps: 'Storage Mappings',
};

const CREATE_LABELS: Record<string, string> = {
  providers: 'Add Provider',
  plans: 'Create Plan',
  networkmaps: 'Create Network Map',
  storagemaps: 'Create Storage Map',
};

export default function ImportPage() {
  const hash = window.location.hash || '';
  const view = hash.match(/import\/(\w+)/)?.[1] || 'providers';
  const View = VIEWS[view] || ProviderList;
  const title = TITLES[view] || 'Import';
  const createLabel = CREATE_LABELS[view];

  const [createProviderOpen, setCreateProviderOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [createNetworkMapOpen, setCreateNetworkMapOpen] = useState(false);
  const [createStorageMapOpen, setCreateStorageMapOpen] = useState(false);

  const handleCreate = () => {
    if (view === 'providers') setCreateProviderOpen(true);
    else if (view === 'plans') setCreatePlanOpen(true);
    else if (view === 'networkmaps') setCreateNetworkMapOpen(true);
    else if (view === 'storagemaps') setCreateStorageMapOpen(true);
  };

  return (
    <SectionBox
      title={
        <SectionFilterHeader
          title={title}
          titleSideActions={[
            ...(createLabel
              ? [
                  <Button
                    key="create"
                    variant="contained"
                    size="small"
                    startIcon={<Icon icon="mdi:plus" />}
                    onClick={handleCreate}
                  >
                    {createLabel}
                  </Button>,
                ]
              : []),
          ]}
        />
      }
    >
      <View />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'right', mt: 2, fontStyle: 'italic', opacity: 0.6 }}
      >
        Powered by Forklift
      </Typography>
      <CreateProviderDialog
        open={createProviderOpen}
        onClose={() => setCreateProviderOpen(false)}
      />
      <CreatePlanDialog open={createPlanOpen} onClose={() => setCreatePlanOpen(false)} />
      <CreateNetworkMapDialog
        open={createNetworkMapOpen}
        onClose={() => setCreateNetworkMapOpen(false)}
      />
      <CreateStorageMapDialog
        open={createStorageMapOpen}
        onClose={() => setCreateStorageMapOpen(false)}
      />
    </SectionBox>
  );
}
