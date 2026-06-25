import { KubeObject } from '@kinvolk/headlamp-plugin/lib/K8s/cluster';

class ForkliftNetworkMap extends KubeObject {
  get spec() {
    return this.jsonData?.spec;
  }

  get status() {
    return this.jsonData?.status;
  }

  static kind = 'NetworkMap';
  static apiVersion = 'forklift.konveyor.io/v1beta1';
  static isNamespaced = true;
  static apiName = 'networkmaps';

  getSourceProvider(): string {
    return this.spec?.provider?.source?.name || '';
  }

  getDestinationProvider(): string {
    return this.spec?.provider?.destination?.name || '';
  }

  getMappings(): Array<{
    source: { id?: string; name?: string; type?: string };
    destination: { type: string; name?: string; namespace?: string };
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

export default ForkliftNetworkMap;
