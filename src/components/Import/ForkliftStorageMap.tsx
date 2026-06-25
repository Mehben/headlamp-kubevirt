import { KubeObject } from '@kinvolk/headlamp-plugin/lib/K8s/cluster';

class ForkliftStorageMap extends KubeObject {
  get spec() {
    return this.jsonData?.spec;
  }

  get status() {
    return this.jsonData?.status;
  }

  static kind = 'StorageMap';
  static apiVersion = 'forklift.konveyor.io/v1beta1';
  static isNamespaced = true;
  static apiName = 'storagemaps';

  getSourceProvider(): string {
    return this.spec?.provider?.source?.name || '';
  }

  getDestinationProvider(): string {
    return this.spec?.provider?.destination?.name || '';
  }

  getMappings(): Array<{
    source: { id?: string; name?: string };
    destination: { storageClass: string; volumeMode?: string; accessMode?: string };
  }> {
    return this.spec?.map || [];
  }

  getMappingCount(): number {
    return this.getMappings().length;
  }

  isReady(): boolean {
    const conditions = this.status?.conditions || [];
    return conditions.some(
      (c: { type: string; status: string }) => c.type === 'Ready' && c.status === 'True'
    );
  }
}

export default ForkliftStorageMap;
