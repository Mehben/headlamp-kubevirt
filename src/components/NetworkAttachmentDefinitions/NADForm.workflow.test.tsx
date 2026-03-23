/**
 * Workflow tests — simulate a real user filling out the NADForm end-to-end.
 *
 * Unlike unit tests that test one field at a time, these render the form with
 * live state (like CreateResourceDialog does), interact with multiple fields
 * sequentially, and verify the complete resource that would be submitted.
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import NADForm from './NADForm';

/** Wrapper that holds state like CreateResourceDialog does */
function FormWrapper({
  initial,
  onSnapshot,
}: {
  initial: any;
  onSnapshot?: (resource: any) => void;
}) {
  const [resource, setResource] = useState(initial);

  const handleChange = (updated: any) => {
    setResource(updated);
    onSnapshot?.(updated);
  };

  return (
    <>
      <NADForm resource={resource} onChange={handleChange} />
      {/* Hidden element to read final state */}
      <div data-testid="resource-snapshot">{JSON.stringify(resource)}</div>
    </>
  );
}

/** Read the current resource from the hidden snapshot element */
function getResource(): any {
  return JSON.parse(screen.getByTestId('resource-snapshot').textContent!);
}

/** Get the checkbox input inside a MUI Switch FormControlLabel */
function getSwitch(labelText: string): HTMLInputElement {
  const labelEl = screen.getByText(labelText);
  const fcl = labelEl.closest('.MuiFormControlLabel-root');
  if (!fcl) throw new Error(`No FormControlLabel for "${labelText}"`);
  const input = fcl.querySelector('input[type="checkbox"]') as HTMLInputElement;
  if (!input) throw new Error(`No checkbox for "${labelText}"`);
  return input;
}

const INITIAL_NAD = {
  apiVersion: 'k8s.cni.cncf.io/v1',
  kind: 'NetworkAttachmentDefinition',
  metadata: { name: '', namespace: 'default' },
  spec: {
    config: JSON.stringify(
      { cniVersion: '0.3.1', type: 'bridge', bridge: 'br0', ipam: {} },
      null,
      2
    ),
  },
};

describe('NADForm Workflows', () => {
  // ─── Workflow 1: Create a bridge network with host-local IPAM ──────

  it('creates a bridge network with gateway, IPAM subnet and routes', () => {
    render(<FormWrapper initial={INITIAL_NAD} />);

    // Step 1: Set name and namespace
    fireEvent.change(screen.getByPlaceholderText('my-network'), {
      target: { value: 'management-net' },
    });
    fireEvent.change(screen.getByLabelText('Namespace *'), {
      target: { value: 'vm-workloads' },
    });

    // Step 2: Bridge is already selected. Configure bridge settings
    fireEvent.change(screen.getByLabelText('Bridge Name'), {
      target: { value: 'mgmt-br0' },
    });
    fireEvent.change(screen.getByLabelText('MTU'), {
      target: { value: '9000' },
    });
    fireEvent.change(screen.getByLabelText('VLAN Tag'), {
      target: { value: '100' },
    });

    // Step 3: Enable gateway and IP masquerade
    fireEvent.click(getSwitch('Gateway'));
    fireEvent.click(getSwitch('IP Masquerade'));

    // Step 4: Switch IPAM to host-local by selecting it from the dropdown
    // The IPAM Type is a select field — we need to open and select
    // For MUI Select, we change the hidden input via the native select mechanism
    const ipamSelect = screen.getByLabelText('IPAM Type');
    // MUI selects use role="combobox", fire mouseDown to open
    fireEvent.mouseDown(ipamSelect);
    // Find and click "Host-Local" in the listbox
    const listbox = screen.getByRole('listbox');
    fireEvent.click(within(listbox).getByText('Host-Local'));

    // Step 5: Fill in the subnet range
    fireEvent.change(screen.getByLabelText('Subnet *'), {
      target: { value: '10.10.0.0/24' },
    });
    fireEvent.change(screen.getByLabelText('Range Start'), {
      target: { value: '10.10.0.10' },
    });
    fireEvent.change(screen.getByLabelText('Range End'), {
      target: { value: '10.10.0.200' },
    });
    fireEvent.change(screen.getByLabelText('Gateway'), {
      target: { value: '10.10.0.1' },
    });

    // ── Verify the complete resource ──
    const resource = getResource();
    expect(resource.metadata.name).toBe('management-net');
    expect(resource.metadata.namespace).toBe('vm-workloads');

    const config = JSON.parse(resource.spec.config);
    expect(config.cniVersion).toBe('0.3.1');
    expect(config.type).toBe('bridge');
    expect(config.bridge).toBe('mgmt-br0');
    expect(config.mtu).toBe(9000);
    expect(config.vlan).toBe(100);
    expect(config.isGateway).toBe(true);
    expect(config.ipMasq).toBe(true);
    expect(config.ipam.type).toBe('host-local');
    expect(config.ipam.ranges[0][0].subnet).toBe('10.10.0.0/24');
    expect(config.ipam.ranges[0][0].rangeStart).toBe('10.10.0.10');
    expect(config.ipam.ranges[0][0].rangeEnd).toBe('10.10.0.200');
    expect(config.ipam.ranges[0][0].gateway).toBe('10.10.0.1');
  });

  // ─── Workflow 2: Create a macvlan network with DHCP ────────────────

  it('creates a macvlan network with DHCP', () => {
    render(<FormWrapper initial={INITIAL_NAD} />);

    // Step 1: Name it
    fireEvent.change(screen.getByPlaceholderText('my-network'), {
      target: { value: 'external-macvlan' },
    });

    // Step 2: Switch to macvlan
    fireEvent.click(screen.getByText('Macvlan'));

    // Step 3: Set master interface
    fireEvent.change(screen.getByLabelText('Master Interface'), {
      target: { value: 'eno1' },
    });

    // Step 4: Switch IPAM to DHCP
    const ipamSelect = screen.getByLabelText('IPAM Type');
    fireEvent.mouseDown(ipamSelect);
    fireEvent.click(within(screen.getByRole('listbox')).getByText('DHCP'));

    // ── Verify ──
    const resource = getResource();
    expect(resource.metadata.name).toBe('external-macvlan');

    const config = JSON.parse(resource.spec.config);
    expect(config.type).toBe('macvlan');
    expect(config.mode).toBe('bridge'); // default mode
    expect(config.master).toBe('eno1');
    expect(config.ipam.type).toBe('dhcp');
    // Should NOT have bridge-specific fields
    expect(config.bridge).toBeUndefined();
    expect(config.isGateway).toBeUndefined();
  });

  // ─── Workflow 3: Create SR-IOV with static IP ─────────────────────

  it('creates an SR-IOV network with static IP', () => {
    render(<FormWrapper initial={INITIAL_NAD} />);

    // Step 1: Name
    fireEvent.change(screen.getByPlaceholderText('my-network'), {
      target: { value: 'sriov-storage' },
    });

    // Step 2: Select SR-IOV type
    fireEvent.click(screen.getByText('SR-IOV'));

    // Step 3: Configure SR-IOV VLAN
    fireEvent.change(screen.getByLabelText('VLAN'), {
      target: { value: '200' },
    });
    fireEvent.change(screen.getByLabelText('VLAN QoS'), {
      target: { value: '5' },
    });

    // Step 4: Switch IPAM to static
    const ipamSelect = screen.getByLabelText('IPAM Type');
    fireEvent.mouseDown(ipamSelect);
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Static'));

    // Step 5: Fill static address
    fireEvent.change(screen.getByLabelText('Address (CIDR) *'), {
      target: { value: '192.168.100.10/24' },
    });

    // ── Verify ──
    const resource = getResource();
    const config = JSON.parse(resource.spec.config);
    expect(config.type).toBe('sriov');
    expect(config.vlan).toBe(200);
    expect(config.vlanQoS).toBe(5);
    expect(config.ipam.type).toBe('static');
    expect(config.ipam.addresses[0].address).toBe('192.168.100.10/24');
  });

  // ─── Workflow 4: Switch types and verify clean state ──────────────

  it('switches between types and keeps state clean', () => {
    render(<FormWrapper initial={INITIAL_NAD} />);

    // Start with bridge, configure it
    fireEvent.change(screen.getByLabelText('Bridge Name'), {
      target: { value: 'my-bridge' },
    });
    fireEvent.click(getSwitch('Hairpin Mode'));

    // Switch to VLAN
    fireEvent.click(screen.getByText('VLAN'));

    let config = JSON.parse(getResource().spec.config);
    expect(config.type).toBe('vlan');
    expect(config.bridge).toBeUndefined(); // bridge-specific field gone
    expect(config.hairpinMode).toBeUndefined(); // bridge option gone
    expect(config.cniVersion).toBe('0.3.1'); // common field preserved

    // Configure VLAN
    fireEvent.change(screen.getByLabelText('Master Interface *'), {
      target: { value: 'eth0' },
    });
    fireEvent.change(screen.getByLabelText('VLAN ID *'), {
      target: { value: '42' },
    });

    // Switch to TAP
    fireEvent.click(screen.getByText('TAP'));

    config = JSON.parse(getResource().spec.config);
    expect(config.type).toBe('tap');
    expect(config.master).toBeUndefined(); // vlan-specific field gone
    expect(config.vlanId).toBeUndefined(); // vlan-specific field gone
    expect(config.cniVersion).toBe('0.3.1'); // still preserved

    // Switch back to bridge — "Bridge" text appears in both the card and the TAP Bridge field,
    // so target the card specifically via the subtitle2 typography
    const bridgeCards = screen.getAllByText('Bridge');
    const bridgeCard = bridgeCards.find(el => el.tagName === 'H6');
    fireEvent.click(bridgeCard!);

    config = JSON.parse(getResource().spec.config);
    expect(config.type).toBe('bridge');
    expect(config.bridge).toBe('br0'); // default bridge name restored
  });

  // ─── Workflow 5: Create host-device with PCI bus ID ───────────────

  it('creates a host-device network with PCI passthrough', () => {
    render(<FormWrapper initial={INITIAL_NAD} />);

    fireEvent.change(screen.getByPlaceholderText('my-network'), {
      target: { value: 'gpu-passthrough' },
    });
    fireEvent.change(screen.getByLabelText('Namespace *'), {
      target: { value: 'gpu-workloads' },
    });

    // Select host-device
    fireEvent.click(screen.getByText('Host Device'));

    // Warning should appear (no device set yet)
    expect(screen.getByText(/At least one of device name/)).toBeInTheDocument();

    // Set PCI Bus ID
    fireEvent.change(screen.getByLabelText('PCI Bus ID'), {
      target: { value: '0000:04:00.0' },
    });

    // Warning should disappear
    expect(screen.queryByText(/At least one of device name/)).not.toBeInTheDocument();

    // ── Verify ──
    const resource = getResource();
    expect(resource.metadata.name).toBe('gpu-passthrough');
    expect(resource.metadata.namespace).toBe('gpu-workloads');

    const config = JSON.parse(resource.spec.config);
    expect(config.type).toBe('host-device');
    expect(config.pciBusID).toBe('0000:04:00.0');
  });

  // ─── Workflow 6: Full TAP configuration ───────────────────────────

  it('creates a fully-configured TAP network', () => {
    render(<FormWrapper initial={INITIAL_NAD} />);

    fireEvent.change(screen.getByPlaceholderText('my-network'), {
      target: { value: 'vm-tap-net' },
    });

    // Select TAP
    fireEvent.click(screen.getByText('TAP'));

    // Fill all TAP fields
    fireEvent.change(screen.getByLabelText('MAC Address'), {
      target: { value: '02:00:00:00:00:01' },
    });
    fireEvent.change(screen.getByLabelText('MTU'), {
      target: { value: '1500' },
    });
    fireEvent.change(screen.getByLabelText('Bridge'), {
      target: { value: 'virbr0' },
    });
    fireEvent.change(screen.getByLabelText('SELinux Context'), {
      target: { value: 'system_u:system_r:container_t:s0' },
    });
    fireEvent.click(getSwitch('Multi-Queue'));

    // ── Verify ──
    const config = JSON.parse(getResource().spec.config);
    expect(config.type).toBe('tap');
    expect(config.mac).toBe('02:00:00:00:00:01');
    expect(config.mtu).toBe(1500);
    expect(config.bridge).toBe('virbr0');
    expect(config.selinuxcontext).toBe('system_u:system_r:container_t:s0');
    expect(config.multiQueue).toBe(true);
  });

  // ─── Workflow 7: IPvlan L3 with no IPAM ───────────────────────────

  it('creates an IPvlan L3 network without IPAM', () => {
    render(<FormWrapper initial={INITIAL_NAD} />);

    fireEvent.change(screen.getByPlaceholderText('my-network'), {
      target: { value: 'ipvlan-backend' },
    });

    // Select IPvlan
    fireEvent.click(screen.getByText('IPvlan'));

    // Set master
    fireEvent.change(screen.getByLabelText('Master Interface'), {
      target: { value: 'bond0' },
    });

    // IPAM stays at "none" by default
    expect(screen.getByText(/L2 only networking/)).toBeInTheDocument();

    // ── Verify ──
    const config = JSON.parse(getResource().spec.config);
    expect(config.type).toBe('ipvlan');
    expect(config.mode).toBe('l2'); // default
    expect(config.master).toBe('bond0');
    expect(config.ipam).toEqual({}); // no IPAM
  });

  // ─── Workflow 8: VLAN with host-local IPAM and route ──────────────

  it('creates a VLAN network with host-local IPAM', () => {
    render(<FormWrapper initial={INITIAL_NAD} />);

    fireEvent.change(screen.getByPlaceholderText('my-network'), {
      target: { value: 'storage-vlan' },
    });

    // Select VLAN
    fireEvent.click(screen.getByText('VLAN'));

    // Configure VLAN
    fireEvent.change(screen.getByLabelText('Master Interface *'), {
      target: { value: 'eth0' },
    });
    fireEvent.change(screen.getByLabelText('VLAN ID *'), {
      target: { value: '300' },
    });
    fireEvent.change(screen.getByLabelText('MTU'), {
      target: { value: '9000' },
    });

    // Switch IPAM to host-local
    const ipamSelect = screen.getByLabelText('IPAM Type');
    fireEvent.mouseDown(ipamSelect);
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Host-Local'));

    // Fill subnet
    fireEvent.change(screen.getByLabelText('Subnet *'), {
      target: { value: '172.16.0.0/24' },
    });

    // ── Verify complete resource ──
    const resource = getResource();
    expect(resource.apiVersion).toBe('k8s.cni.cncf.io/v1');
    expect(resource.kind).toBe('NetworkAttachmentDefinition');
    expect(resource.metadata.name).toBe('storage-vlan');

    const config = JSON.parse(resource.spec.config);
    expect(config.type).toBe('vlan');
    expect(config.master).toBe('eth0');
    expect(config.vlanId).toBe(300);
    expect(config.mtu).toBe(9000);
    expect(config.ipam.type).toBe('host-local');
    expect(config.ipam.ranges[0][0].subnet).toBe('172.16.0.0/24');
  });
});
