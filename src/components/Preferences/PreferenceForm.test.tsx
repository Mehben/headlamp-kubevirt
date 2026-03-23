import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PreferenceForm from './PreferenceForm';

function makePreference(overrides: any = {}) {
  return {
    apiVersion: 'instancetype.kubevirt.io/v1beta1',
    kind: 'VirtualMachineClusterPreference',
    metadata: { name: 'test-pref', ...overrides.metadata },
    spec: {
      devices: {
        preferredDiskBus: 'virtio',
        preferredInterfaceModel: 'virtio',
      },
      ...overrides.spec,
    },
  };
}

function getSwitch(labelText: string): HTMLInputElement {
  const labelEl = screen.getByText(labelText);
  const fcl = labelEl.closest('.MuiFormControlLabel-root');
  if (!fcl) throw new Error(`No FormControlLabel for "${labelText}"`);
  const input = fcl.querySelector('input[type="checkbox"]') as HTMLInputElement;
  if (!input) throw new Error(`No checkbox for "${labelText}"`);
  return input;
}

describe('PreferenceForm', () => {
  // ─── Basic Information ───────────────────────────────────────────────

  describe('Basic Information', () => {
    it('renders name field', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Name *')).toHaveValue('test-pref');
    });

    it('updates name', () => {
      const onChange = vi.fn();
      render(<PreferenceForm resource={makePreference()} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('Name *'), { target: { value: 'new-pref' } });

      expect(onChange.mock.calls[0][0].metadata.name).toBe('new-pref');
    });

    it('renders display name field', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
    });

    it('renders OS type selector with Linux default', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.getByText('Operating system type for this preference')).toBeInTheDocument();
    });
  });

  // ─── Device Preferences ──────────────────────────────────────────────

  describe('Device Preferences', () => {
    it('renders disk bus selector', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.getByText('Preferred disk bus type')).toBeInTheDocument();
    });

    it('renders network interface model selector', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.getByText('Preferred network interface model')).toBeInTheDocument();
    });

    it('toggles disk dedicated IO thread', () => {
      const onChange = vi.fn();
      render(<PreferenceForm resource={makePreference()} onChange={onChange} />);

      fireEvent.click(getSwitch('Disk Dedicated IO Thread'));

      expect(onChange.mock.calls[0][0].spec.devices.preferredDiskDedicatedIoThread).toBe(true);
    });

    it('toggles auto-attach input device', () => {
      const onChange = vi.fn();
      render(<PreferenceForm resource={makePreference()} onChange={onChange} />);

      fireEvent.click(getSwitch('Auto-attach Input Device'));

      expect(onChange.mock.calls[0][0].spec.devices.preferredAutoattachInputDevice).toBe(true);
    });
  });

  // ─── Firmware ────────────────────────────────────────────────────────

  describe('Firmware', () => {
    it('renders EFI boot switch', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.getByText('Use EFI Boot')).toBeInTheDocument();
    });

    it('enables EFI boot', () => {
      const onChange = vi.fn();
      render(<PreferenceForm resource={makePreference()} onChange={onChange} />);

      fireEvent.click(getSwitch('Use EFI Boot'));

      expect(onChange.mock.calls[0][0].spec.firmware).toEqual({ preferredEfi: {} });
    });

    it('shows secure boot option when EFI is enabled', () => {
      const res = makePreference({
        spec: {
          devices: { preferredDiskBus: 'virtio', preferredInterfaceModel: 'virtio' },
          firmware: { preferredEfi: {} },
        },
      });
      render(<PreferenceForm resource={res} onChange={vi.fn()} />);

      expect(screen.getByText('Enable Secure Boot')).toBeInTheDocument();
    });

    it('does not show secure boot when EFI is disabled', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.queryByText('Enable Secure Boot')).not.toBeInTheDocument();
    });

    it('toggles secure boot', () => {
      const onChange = vi.fn();
      const res = makePreference({
        spec: {
          devices: { preferredDiskBus: 'virtio', preferredInterfaceModel: 'virtio' },
          firmware: { preferredEfi: {} },
        },
      });
      render(<PreferenceForm resource={res} onChange={onChange} />);

      fireEvent.click(getSwitch('Enable Secure Boot'));

      expect(onChange.mock.calls[0][0].spec.firmware.preferredEfi.secureBoot).toBe(true);
    });

    it('renders SMM switch', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.getByText('Enable SMM (System Management Mode)')).toBeInTheDocument();
    });

    it('enables SMM', () => {
      const onChange = vi.fn();
      render(<PreferenceForm resource={makePreference()} onChange={onChange} />);

      fireEvent.click(getSwitch('Enable SMM (System Management Mode)'));

      expect(onChange.mock.calls[0][0].spec.features).toEqual({ preferredSmm: {} });
    });

    it('disables EFI by removing firmware', () => {
      const onChange = vi.fn();
      const res = makePreference({
        spec: {
          devices: { preferredDiskBus: 'virtio', preferredInterfaceModel: 'virtio' },
          firmware: { preferredEfi: {} },
        },
      });
      render(<PreferenceForm resource={res} onChange={onChange} />);

      fireEvent.click(getSwitch('Use EFI Boot'));

      expect(onChange.mock.calls[0][0].spec.firmware).toBeUndefined();
    });
  });

  // ─── Minimum Requirements ────────────────────────────────────────────

  describe('Minimum Requirements', () => {
    it('renders toggle switch', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.getByText('Specify Minimum Requirements')).toBeInTheDocument();
    });

    it('does not show min fields when disabled', () => {
      render(<PreferenceForm resource={makePreference()} onChange={vi.fn()} />);

      expect(screen.queryByLabelText('Minimum CPU Cores')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Minimum Memory')).not.toBeInTheDocument();
    });

    it('enables min requirements with defaults', () => {
      const onChange = vi.fn();
      render(<PreferenceForm resource={makePreference()} onChange={onChange} />);

      fireEvent.click(getSwitch('Specify Minimum Requirements'));

      const updated = onChange.mock.calls[0][0];
      expect(updated.spec.requirements.cpu.guest).toBe(1);
      expect(updated.spec.requirements.memory.guest).toBe('1Gi');
    });

    it('shows min fields when enabled', () => {
      const res = makePreference({
        spec: {
          devices: { preferredDiskBus: 'virtio', preferredInterfaceModel: 'virtio' },
          requirements: { cpu: { guest: 2 }, memory: { guest: '4Gi' } },
        },
      });
      render(<PreferenceForm resource={res} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Minimum CPU Cores')).toHaveValue(2);
      expect(screen.getByLabelText('Minimum Memory')).toHaveValue(4);
    });

    it('updates minimum CPU', () => {
      const onChange = vi.fn();
      const res = makePreference({
        spec: {
          devices: { preferredDiskBus: 'virtio', preferredInterfaceModel: 'virtio' },
          requirements: { cpu: { guest: 2 }, memory: { guest: '4Gi' } },
        },
      });
      render(<PreferenceForm resource={res} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('Minimum CPU Cores'), { target: { value: '4' } });

      expect(onChange.mock.calls[0][0].spec.requirements.cpu.guest).toBe(4);
    });

    it('disables min requirements by removing field', () => {
      const onChange = vi.fn();
      const res = makePreference({
        spec: {
          devices: { preferredDiskBus: 'virtio', preferredInterfaceModel: 'virtio' },
          requirements: { cpu: { guest: 2 }, memory: { guest: '4Gi' } },
        },
      });
      render(<PreferenceForm resource={res} onChange={onChange} />);

      fireEvent.click(getSwitch('Specify Minimum Requirements'));

      expect(onChange.mock.calls[0][0].spec.requirements).toBeUndefined();
    });
  });
});
