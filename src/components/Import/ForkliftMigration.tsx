import { KubeObject } from '@kinvolk/headlamp-plugin/lib/K8s/cluster';

class ForkliftMigration extends KubeObject {
  get spec() {
    return this.jsonData?.spec;
  }

  get status() {
    return this.jsonData?.status;
  }

  static kind = 'Migration';
  static apiVersion = 'forklift.konveyor.io/v1beta1';
  static isNamespaced = true;
  static apiName = 'migrations';

  getPlanName(): string {
    return this.spec?.plan?.name || '';
  }

  getPlanNamespace(): string {
    return this.spec?.plan?.namespace || '';
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

  isRunning(): boolean {
    return !this.isSucceeded() && !this.isFailed();
  }

  getStatusText(): string {
    if (this.isSucceeded()) return 'Succeeded';
    if (this.isFailed()) return 'Failed';
    return 'Running';
  }

  getStatusColor(): 'success' | 'error' | 'info' {
    if (this.isSucceeded()) return 'success';
    if (this.isFailed()) return 'error';
    return 'info';
  }
}

export default ForkliftMigration;
