/**
 * Forklift Inventory API client.
 * Accesses the forklift-inventory service through the inventory proxy.
 *
 * The inventory API provides VM, network, and storage data from source providers.
 * Path pattern: /providers/{type}/{uid}/{subPath}
 *
 * The forklift-inventory service requires the forklift-controller SA token,
 * not the user's kubeconfig token. The forklift-inventory-proxy (OpenResty/Lua)
 * sits in front and injects the SA token before forwarding to inventory:8443.
 */

import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { getForkliftNamespace } from '../index';

function getProxyBase(): string {
  return `/api/v1/namespaces/${getForkliftNamespace()}/services/forklift-inventory-proxy:8080/proxy`;
}

async function inventoryRequest(path: string): Promise<unknown> {
  const url = `${getProxyBase()}${path}`;
  try {
    const result = await ApiProxy.request(url);
    console.debug('[forklift-inventory] OK:', url, result);
    return result;
  } catch (e) {
    console.warn('[forklift-inventory] Failed:', url, e);
    return null;
  }
}

export interface InventoryVM {
  id: string;
  name: string;
  namespace?: string;
  selfLink?: string;
  revision?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface InventoryNetwork {
  id: string;
  name: string;
  namespace?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface InventoryStorage {
  id: string;
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/** Get VMs from a provider's inventory.
 *  Falls back to K8s API (lists KubeVirt VMs directly). */
export async function getProviderVMs(
  providerType: string,
  providerUid: string
): Promise<InventoryVM[]> {
  console.debug('[forklift-inventory] getProviderVMs', { providerType, providerUid });

  // Try inventory API first
  const data = await inventoryRequest(`/providers/${providerType}/${providerUid}/vms?detail=4`);
  if (Array.isArray(data) && data.length > 0) return data;

  // Fallback: list KubeVirt VMs directly from K8s API
  try {
    console.debug('[forklift-inventory] Trying K8s API fallback for VMs');
    const resp = (await ApiProxy.request('/apis/kubevirt.io/v1/virtualmachines')) as {
      items?: Array<{ metadata: { name: string; namespace: string; uid: string } }>;
    };
    const vms = (resp?.items || []).map(vm => ({
      id: vm.metadata.uid,
      name: vm.metadata.name,
      namespace: vm.metadata.namespace,
    }));
    console.debug('[forklift-inventory] K8s API fallback returned', vms.length, 'VMs');
    return vms;
  } catch (e) {
    console.warn('[forklift-inventory] K8s API fallback failed', e);
    return [];
  }
}

/** Get networks from a provider's inventory.
 *  Falls back to K8s API for openshift providers. */
export async function getProviderNetworks(
  providerType: string,
  providerUid: string
): Promise<InventoryNetwork[]> {
  const subPath = providerType === 'openshift' ? 'networkattachmentdefinitions' : 'networks';
  const data = await inventoryRequest(`/providers/${providerType}/${providerUid}/${subPath}`);
  if (Array.isArray(data) && data.length > 0) return data;

  // Fallback for openshift: list NADs from K8s API
  if (providerType === 'openshift') {
    try {
      const resp = (await ApiProxy.request(
        '/apis/k8s.cni.cncf.io/v1/network-attachment-definitions'
      )) as { items?: Array<{ metadata: { name: string; namespace: string; uid: string } }> };
      return (resp?.items || []).map(n => ({
        id: n.metadata.uid,
        name: n.metadata.name,
        namespace: n.metadata.namespace,
      }));
    } catch {
      return [];
    }
  }
  return [];
}

/** Get storage from a provider's inventory.
 *  Falls back to K8s API for openshift providers. */
export async function getProviderStorage(
  providerType: string,
  providerUid: string
): Promise<InventoryStorage[]> {
  const subPath = providerType === 'openshift' ? 'storageclasses' : 'storages';
  const data = await inventoryRequest(`/providers/${providerType}/${providerUid}/${subPath}`);
  if (Array.isArray(data) && data.length > 0) return data;

  // Fallback for openshift: list StorageClasses from K8s API
  if (providerType === 'openshift') {
    try {
      const resp = (await ApiProxy.request('/apis/storage.k8s.io/v1/storageclasses')) as {
        items?: Array<{ metadata: { name: string; uid: string } }>;
      };
      return (resp?.items || []).map(s => ({
        id: s.metadata.uid,
        name: s.metadata.name,
      }));
    } catch {
      return [];
    }
  }
  return [];
}

/** Get provider summary from inventory */
export async function getProviderSummary(
  providerType: string,
  providerUid: string
): Promise<{ vmCount: number; networkCount: number; storageClassCount: number } | null> {
  const data = (await inventoryRequest(`/providers/${providerType}/${providerUid}`)) as Record<
    string,
    unknown
  > | null;
  if (!data) return null;
  return {
    vmCount: (data.vmCount as number) || 0,
    networkCount: (data.networkCount as number) || 0,
    storageClassCount: (data.storageClassCount as number) || 0,
  };
}

/** Get namespaces from a provider's inventory (openshift providers). */
export async function getProviderNamespaces(
  providerType: string,
  providerUid: string
): Promise<string[]> {
  const data = await inventoryRequest(`/providers/${providerType}/${providerUid}/namespaces`);
  if (Array.isArray(data)) {
    return data.map((n: { name?: string }) => n.name || '').filter(Boolean).sort();
  }
  // Fallback: list namespaces via K8s API
  try {
    const resp = (await ApiProxy.request('/api/v1/namespaces')) as {
      items?: Array<{ metadata: { name: string } }>;
    };
    return (resp?.items || []).map(n => n.metadata.name).sort();
  } catch {
    return [];
  }
}
