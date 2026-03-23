import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import NADForm from './NADForm';

function makeNAD(configOverrides: any = {}) {
  const config = {
    cniVersion: '0.3.1',
    type: 'bridge',
    bridge: 'br0',
    ipam: {},
    ...configOverrides,
  };
  return {
    apiVersion: 'k8s.cni.cncf.io/v1',
    kind: 'NetworkAttachmentDefinition',
    metadata: { name: 'test-nad', namespace: 'default' },
    spec: { config: JSON.stringify(config, null, 2) },
  };
}

function getConfig(resource: any): any {
  return JSON.parse(resource.spec.config);
}

/** Get the input element inside a MUI Switch FormControlLabel by searching for the switch role */
function getSwitch(labelText: string): HTMLInputElement {
  // Find the text, walk up to the FormControlLabel, find the checkbox input
  const labelEl = screen.getByText(labelText);
  const formControlLabel = labelEl.closest('.MuiFormControlLabel-root');
  if (!formControlLabel) throw new Error(`No FormControlLabel found for "${labelText}"`);
  const input = formControlLabel.querySelector('input[type="checkbox"]') as HTMLInputElement;
  if (!input) throw new Error(`No checkbox input found in FormControlLabel for "${labelText}"`);
  return input;
}

describe('NADForm', () => {
  // ─── Basic Information ───────────────────────────────────────────────

  describe('Basic Information', () => {
    it('renders name and namespace fields', () => {
      render(<NADForm resource={makeNAD()} onChange={vi.fn()} />);

      expect(screen.getByPlaceholderText('my-network')).toHaveValue('test-nad');
      expect(screen.getByLabelText('Namespace *')).toHaveValue('default');
    });

    it('updates name on change', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('my-network'), {
        target: { value: 'new-name' },
      });

      expect(onChange).toHaveBeenCalled();
      const updated = onChange.mock.calls[0][0];
      expect(updated.metadata.name).toBe('new-name');
    });

    it('updates namespace on change', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('Namespace *'), { target: { value: 'production' } });

      expect(onChange).toHaveBeenCalled();
      const updated = onChange.mock.calls[0][0];
      expect(updated.metadata.namespace).toBe('production');
    });

    it('renders CNI version selector', () => {
      render(<NADForm resource={makeNAD()} onChange={vi.fn()} />);

      expect(screen.getByText('CNI specification version')).toBeInTheDocument();
    });
  });

  // ─── CNI Type Selection ──────────────────────────────────────────────

  describe('CNI Type Selection', () => {
    it('shows all 8 CNI type cards', () => {
      render(<NADForm resource={makeNAD()} onChange={vi.fn()} />);

      expect(screen.getByText('Bridge')).toBeInTheDocument();
      expect(screen.getByText('Macvlan')).toBeInTheDocument();
      expect(screen.getByText('IPvlan')).toBeInTheDocument();
      expect(screen.getByText('VLAN')).toBeInTheDocument();
      expect(screen.getByText('Host Device')).toBeInTheDocument();
      expect(screen.getByText('SR-IOV')).toBeInTheDocument();
      expect(screen.getByText('PTP')).toBeInTheDocument();
      expect(screen.getByText('TAP')).toBeInTheDocument();
    });

    it('selecting macvlan sets type and default mode', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.click(screen.getByText('Macvlan'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.type).toBe('macvlan');
      expect(config.mode).toBe('bridge');
      expect(config.bridge).toBeUndefined();
    });

    it('selecting ipvlan sets type and default mode', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.click(screen.getByText('IPvlan'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.type).toBe('ipvlan');
      expect(config.mode).toBe('l2');
    });

    it('selecting vlan sets type without old fields', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.click(screen.getByText('VLAN'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.type).toBe('vlan');
      expect(config.bridge).toBeUndefined();
    });

    it('selecting bridge sets default bridge name', () => {
      const onChange = vi.fn();
      render(
        <NADForm resource={makeNAD({ type: 'macvlan', mode: 'bridge' })} onChange={onChange} />
      );

      fireEvent.click(screen.getByText('Bridge'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.type).toBe('bridge');
      expect(config.bridge).toBe('br0');
    });

    it('preserves IPAM config when switching CNI type', () => {
      const onChange = vi.fn();
      const resource = makeNAD({
        type: 'bridge',
        bridge: 'br0',
        ipam: { type: 'host-local', ranges: [[{ subnet: '10.0.0.0/24' }]] },
      });
      render(<NADForm resource={resource} onChange={onChange} />);

      fireEvent.click(screen.getByText('Macvlan'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.type).toBe('macvlan');
      expect(config.ipam.type).toBe('host-local');
      expect(config.ipam.ranges[0][0].subnet).toBe('10.0.0.0/24');
    });

    it('preserves CNI version when switching type', () => {
      const onChange = vi.fn();
      const resource = makeNAD({ cniVersion: '1.0.0' });
      render(<NADForm resource={resource} onChange={onChange} />);

      fireEvent.click(screen.getByText('VLAN'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.cniVersion).toBe('1.0.0');
    });
  });

  // ─── Bridge Configuration ────────────────────────────────────────────

  describe('Bridge Configuration', () => {
    it('renders bridge-specific fields', () => {
      render(<NADForm resource={makeNAD()} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Bridge Name')).toBeInTheDocument();
      expect(screen.getByText('Gateway')).toBeInTheDocument();
      expect(screen.getByText('IP Masquerade')).toBeInTheDocument();
      expect(screen.getByText('Hairpin Mode')).toBeInTheDocument();
      expect(screen.getByText('Promiscuous Mode')).toBeInTheDocument();
      expect(screen.getByText('MAC Spoof Check')).toBeInTheDocument();
    });

    it('updates bridge name', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('Bridge Name'), { target: { value: 'br1' } });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.bridge).toBe('br1');
    });

    it('toggles isGateway', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.click(getSwitch('Gateway'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.isGateway).toBe(true);
    });

    it('toggles ipMasq', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.click(getSwitch('IP Masquerade'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.ipMasq).toBe(true);
    });

    it('toggles hairpinMode', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.click(getSwitch('Hairpin Mode'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.hairpinMode).toBe(true);
    });

    it('toggles promiscMode', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.click(getSwitch('Promiscuous Mode'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.promiscMode).toBe(true);
    });

    it('toggles macspoofchk', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.click(getSwitch('MAC Spoof Check'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.macspoofchk).toBe(true);
    });

    it('sets MTU as number', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      // Bridge section has MTU with helperText "Interface MTU..."
      const mtuInput = screen.getByLabelText('MTU');
      fireEvent.change(mtuInput, { target: { value: '9000' } });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.mtu).toBe(9000);
    });

    it('sets VLAN tag as number', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('VLAN Tag'), { target: { value: '100' } });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.vlan).toBe(100);
    });

    it('clears MTU when emptied', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD({ mtu: 9000 })} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('MTU'), { target: { value: '' } });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.mtu).toBeUndefined();
    });
  });

  // ─── Macvlan Configuration ───────────────────────────────────────────

  describe('Macvlan Configuration', () => {
    it('renders macvlan-specific fields', () => {
      render(
        <NADForm resource={makeNAD({ type: 'macvlan', mode: 'bridge' })} onChange={vi.fn()} />
      );

      expect(screen.getByLabelText('Master Interface')).toBeInTheDocument();
      expect(screen.getByText('Macvlan operating mode')).toBeInTheDocument();
    });

    it('updates master interface', () => {
      const onChange = vi.fn();
      render(
        <NADForm resource={makeNAD({ type: 'macvlan', mode: 'bridge' })} onChange={onChange} />
      );

      fireEvent.change(screen.getByLabelText('Master Interface'), { target: { value: 'eno1' } });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.master).toBe('eno1');
    });

    it('shows mode descriptions', () => {
      render(
        <NADForm resource={makeNAD({ type: 'macvlan', mode: 'bridge' })} onChange={vi.fn()} />
      );

      expect(screen.getByText(/containers can communicate directly/)).toBeInTheDocument();
    });
  });

  // ─── IPvlan Configuration ────────────────────────────────────────────

  describe('IPvlan Configuration', () => {
    it('renders ipvlan fields', () => {
      render(<NADForm resource={makeNAD({ type: 'ipvlan', mode: 'l2' })} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Master Interface')).toBeInTheDocument();
      expect(screen.getByText(/frame switching, broadcast works/)).toBeInTheDocument();
    });
  });

  // ─── VLAN Configuration ──────────────────────────────────────────────

  describe('VLAN Configuration', () => {
    it('renders VLAN required fields', () => {
      render(<NADForm resource={makeNAD({ type: 'vlan' })} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Master Interface *')).toBeInTheDocument();
      expect(screen.getByLabelText('VLAN ID *')).toBeInTheDocument();
    });

    it('sets vlanId as number', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD({ type: 'vlan' })} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('VLAN ID *'), { target: { value: '42' } });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.vlanId).toBe(42);
    });
  });

  // ─── Host Device Configuration ───────────────────────────────────────

  describe('Host Device Configuration', () => {
    it('shows warning when no device identifier is set', () => {
      render(<NADForm resource={makeNAD({ type: 'host-device' })} onChange={vi.fn()} />);

      expect(screen.getByText(/At least one of device name/)).toBeInTheDocument();
    });

    it('hides warning when device is set', () => {
      render(
        <NADForm resource={makeNAD({ type: 'host-device', device: 'eth1' })} onChange={vi.fn()} />
      );

      expect(screen.queryByText(/At least one of device name/)).not.toBeInTheDocument();
    });

    it('updates device name', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD({ type: 'host-device' })} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('Device Name'), { target: { value: 'eth2' } });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.device).toBe('eth2');
    });

    it('renders all identification fields', () => {
      render(<NADForm resource={makeNAD({ type: 'host-device' })} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Device Name')).toBeInTheDocument();
      expect(screen.getByLabelText('MAC Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Kernel Path')).toBeInTheDocument();
      expect(screen.getByLabelText('PCI Bus ID')).toBeInTheDocument();
    });
  });

  // ─── SR-IOV Configuration ────────────────────────────────────────────

  describe('SR-IOV Configuration', () => {
    it('shows SR-IOV info alert', () => {
      render(<NADForm resource={makeNAD({ type: 'sriov' })} onChange={vi.fn()} />);

      expect(screen.getByText(/SR-IOV requires the SR-IOV device plugin/)).toBeInTheDocument();
    });

    it('renders SR-IOV specific fields', () => {
      render(<NADForm resource={makeNAD({ type: 'sriov' })} onChange={vi.fn()} />);

      expect(screen.getByLabelText('VLAN')).toBeInTheDocument();
      expect(screen.getByLabelText('VLAN QoS')).toBeInTheDocument();
      expect(screen.getByLabelText('MAC Address')).toBeInTheDocument();
    });

    it('sets VLAN as number', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD({ type: 'sriov' })} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('VLAN'), { target: { value: '200' } });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.vlan).toBe(200);
    });
  });

  // ─── PTP Configuration ──────────────────────────────────────────────

  describe('PTP Configuration', () => {
    it('renders PTP fields', () => {
      render(<NADForm resource={makeNAD({ type: 'ptp' })} onChange={vi.fn()} />);

      expect(screen.getByText('IP Masquerade')).toBeInTheDocument();
      expect(screen.getByLabelText('MTU')).toBeInTheDocument();
    });

    it('toggles ipMasq on PTP', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD({ type: 'ptp' })} onChange={onChange} />);

      fireEvent.click(getSwitch('IP Masquerade'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.ipMasq).toBe(true);
    });
  });

  // ─── TAP Configuration ──────────────────────────────────────────────

  describe('TAP Configuration', () => {
    it('renders TAP fields', () => {
      render(<NADForm resource={makeNAD({ type: 'tap' })} onChange={vi.fn()} />);

      expect(screen.getByLabelText('MAC Address')).toBeInTheDocument();
      expect(screen.getByLabelText('Bridge')).toBeInTheDocument();
      expect(screen.getByLabelText('SELinux Context')).toBeInTheDocument();
      expect(screen.getByText('Multi-Queue')).toBeInTheDocument();
    });

    it('toggles multiQueue', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD({ type: 'tap' })} onChange={onChange} />);

      fireEvent.click(getSwitch('Multi-Queue'));

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.multiQueue).toBe(true);
    });

    it('updates MAC address', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD({ type: 'tap' })} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('MAC Address'), {
        target: { value: '02:00:00:00:00:01' },
      });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.mac).toBe('02:00:00:00:00:01');
    });

    it('updates SELinux context', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD({ type: 'tap' })} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('SELinux Context'), {
        target: { value: 'system_u:system_r:container_t:s0' },
      });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.selinuxcontext).toBe('system_u:system_r:container_t:s0');
    });
  });

  // ─── IPAM Configuration ─────────────────────────────────────────────

  describe('IPAM Configuration', () => {
    it('defaults to none (L2 only)', () => {
      render(<NADForm resource={makeNAD()} onChange={vi.fn()} />);

      expect(screen.getByText(/L2 only networking/)).toBeInTheDocument();
    });

    it('shows DHCP info when DHCP selected', () => {
      const resource = makeNAD({ ipam: { type: 'dhcp' } });
      render(<NADForm resource={resource} onChange={vi.fn()} />);

      expect(
        screen.getByText(/IP addresses will be acquired from a DHCP server/)
      ).toBeInTheDocument();
    });

    it('shows subnet range fields for host-local', () => {
      const resource = makeNAD({
        ipam: { type: 'host-local', ranges: [[{ subnet: '10.0.0.0/24' }]] },
      });
      render(<NADForm resource={resource} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Subnet *')).toBeInTheDocument();
      expect(screen.getByLabelText('Range Start')).toBeInTheDocument();
      expect(screen.getByLabelText('Range End')).toBeInTheDocument();
      expect(screen.getByLabelText('Gateway')).toBeInTheDocument();
    });

    it('updates subnet value for host-local', () => {
      const onChange = vi.fn();
      const resource = makeNAD({ ipam: { type: 'host-local', ranges: [[{ subnet: '' }]] } });
      render(<NADForm resource={resource} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('Subnet *'), { target: { value: '192.168.1.0/24' } });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.ipam.ranges[0][0].subnet).toBe('192.168.1.0/24');
    });

    it('shows address fields for static IPAM', () => {
      const resource = makeNAD({
        ipam: { type: 'static', addresses: [{ address: '10.0.0.5/24' }] },
      });
      render(<NADForm resource={resource} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Address (CIDR) *')).toBeInTheDocument();
    });

    it('updates static address', () => {
      const onChange = vi.fn();
      const resource = makeNAD({ ipam: { type: 'static', addresses: [{ address: '' }] } });
      render(<NADForm resource={resource} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('Address (CIDR) *'), {
        target: { value: '10.10.0.5/24' },
      });

      const config = getConfig(onChange.mock.calls[0][0]);
      expect(config.ipam.addresses[0].address).toBe('10.10.0.5/24');
    });

    it('shows routes editor with empty message when no routes', () => {
      const resource = makeNAD({
        ipam: { type: 'host-local', ranges: [[{ subnet: '10.0.0.0/24' }]] },
      });
      render(<NADForm resource={resource} onChange={vi.fn()} />);

      expect(screen.getByText(/No routes configured/)).toBeInTheDocument();
    });
  });

  // ─── Config JSON Integrity ──────────────────────────────────────────

  describe('Config JSON Integrity', () => {
    it('produces valid JSON in spec.config', () => {
      const onChange = vi.fn();
      render(<NADForm resource={makeNAD()} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('Bridge Name'), { target: { value: 'test-br' } });

      const updated = onChange.mock.calls[0][0];
      expect(() => JSON.parse(updated.spec.config)).not.toThrow();
    });

    it('handles malformed initial config gracefully', () => {
      const resource = {
        ...makeNAD(),
        spec: { config: 'not valid json' },
      };

      expect(() => {
        render(<NADForm resource={resource} onChange={vi.fn()} />);
      }).not.toThrow();
    });

    it('handles missing spec.config gracefully', () => {
      const resource = {
        ...makeNAD(),
        spec: {},
      };

      expect(() => {
        render(<NADForm resource={resource} onChange={vi.fn()} />);
      }).not.toThrow();
    });
  });
});
