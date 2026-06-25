import { KubeObject } from '@kinvolk/headlamp-plugin/lib/K8s/cluster';

class ForkliftPlan extends KubeObject {
  get spec() {
    return this.jsonData?.spec;
  }

  get status() {
    return this.jsonData?.status;
  }

  static kind = 'Plan';
  static apiVersion = 'forklift.konveyor.io/v1beta1';
  static isNamespaced = true;
  static apiName = 'plans';

  getTargetNamespace(): string {
    return this.spec?.targetNamespace || '';
  }

  getSourceProvider(): string {
    return this.spec?.provider?.source?.name || '';
  }

  getDestinationProvider(): string {
    return this.spec?.provider?.destination?.name || '';
  }

  getNetworkMap(): string {
    return this.spec?.map?.network?.name || '';
  }

  getStorageMap(): string {
    return this.spec?.map?.storage?.name || '';
  }

  getVMs(): Array<{ id: string; name: string; namespace?: string }> {
    return this.spec?.vms || [];
  }

  getVMCount(): number {
    return this.getVMs().length;
  }

  isReady(): boolean {
    const conditions = this.status?.conditions || [];
    return conditions.some(
      (c: { type: string; status: string }) => c.type === 'Ready' && c.status === 'True'
    );
  }

  isSucceeded(): boolean {
    const conditions = this.status?.conditions || [];
    return conditions.some(
      (c: { type: string; status: string }) => c.type === 'Succeeded' && c.status === 'True'
    );
  }

  isFailed(): boolean {
    const conditions = this.status?.conditions || [];
    return conditions.some(
      (c: { type: string; status: string }) => c.type === 'Failed' && c.status === 'True'
    );
  }

  isExecuting(): boolean {
    const conditions = this.status?.conditions || [];
    return conditions.some(
      (c: { type: string; status: string }) => c.type === 'Executing' && c.status === 'True'
    );
  }

  getStatusText(): string {
    if (this.isSucceeded()) return 'Succeeded';
    if (this.isFailed()) return 'Failed';
    if (this.isExecuting()) return 'Executing';
    if (this.isReady()) return 'Ready';
    return 'Pending';
  }

  getStatusColor(): 'success' | 'error' | 'info' | 'warning' | 'default' {
    if (this.isSucceeded()) return 'success';
    if (this.isFailed()) return 'error';
    if (this.isExecuting()) return 'info';
    if (this.isReady()) return 'warning';
    return 'default';
  }

  isWarm(): boolean {
    return this.spec?.warm === true;
  }

  getDescription(): string {
    return this.spec?.description || '';
  }
}

export default ForkliftPlan;
