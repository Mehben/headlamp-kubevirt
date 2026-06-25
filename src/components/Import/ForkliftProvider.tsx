import { KubeObject } from '@kinvolk/headlamp-plugin/lib/K8s/cluster';

export type ProviderType =
  | 'vsphere'
  | 'ovirt'
  | 'openstack'
  | 'ova'
  | 'openshift'
  | 'ec2'
  | 'hyperv';

export const PROVIDER_TYPE_META: Record<
  ProviderType,
  { label: string; icon: string; color: string }
> = {
  vsphere: { label: 'VMware vSphere', icon: 'mdi:server', color: '#6ba368' },
  ovirt: { label: 'oVirt / RHV', icon: 'mdi:server-network', color: '#e53935' },
  openstack: { label: 'OpenStack', icon: 'mdi:cloud', color: '#ed1944' },
  ova: { label: 'OVA File', icon: 'mdi:file-cabinet', color: '#ff9800' },
  openshift: { label: 'OpenShift / KubeVirt', icon: 'mdi:kubernetes', color: '#326ce5' },
  ec2: { label: 'AWS EC2', icon: 'mdi:aws', color: '#ff9900' },
  hyperv: { label: 'Hyper-V', icon: 'mdi:microsoft-windows', color: '#00a4ef' },
};

class ForkliftProvider extends KubeObject {
  get spec() {
    return this.jsonData?.spec;
  }

  get status() {
    return this.jsonData?.status;
  }

  static kind = 'Provider';
  static apiVersion = 'forklift.konveyor.io/v1beta1';
  static isNamespaced = true;
  static apiName = 'providers';

  getType(): ProviderType {
    return this.spec?.type || 'openshift';
  }

  getUrl(): string {
    return this.spec?.url || '';
  }

  getSecretName(): string {
    return this.spec?.secret?.name || '';
  }

  getPhase(): string {
    return this.status?.phase || 'Unknown';
  }

  isReady(): boolean {
    const conditions = this.status?.conditions || [];
    return conditions.some(
      (c: { type: string; status: string }) => c.type === 'Ready' && c.status === 'True'
    );
  }

  getConditionMessage(type: string): string {
    const conditions = this.status?.conditions || [];
    const cond = conditions.find((c: { type: string }) => c.type === type);
    return cond?.message || '';
  }

  isConnectionTestSucceeded(): boolean {
    const conditions = this.status?.conditions || [];
    return conditions.some(
      (c: { type: string; status: string }) =>
        c.type === 'ConnectionTestSucceeded' && c.status === 'True'
    );
  }

  isInventoryCreated(): boolean {
    const conditions = this.status?.conditions || [];
    return conditions.some(
      (c: { type: string; status: string }) => c.type === 'InventoryCreated' && c.status === 'True'
    );
  }

  getTypeMeta() {
    return PROVIDER_TYPE_META[this.getType()] || PROVIDER_TYPE_META.openshift;
  }
}

export default ForkliftProvider;
