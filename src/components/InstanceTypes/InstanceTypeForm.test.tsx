import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import InstanceTypeForm from './InstanceTypeForm';

function makeInstanceType(overrides: any = {}) {
  return {
    apiVersion: 'instancetype.kubevirt.io/v1beta1',
    kind: 'VirtualMachineClusterInstancetype',
    metadata: { name: 'test-it', ...overrides.metadata },
    spec: {
      cpu: { guest: 4 },
      memory: { guest: '8Gi' },
      ...overrides.spec,
    },
  };
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

describe('InstanceTypeForm', () => {
  // ─── Basic Information ───────────────────────────────────────────────

  describe('Basic Information', () => {
    it('renders name field with value', () => {
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={vi.fn()} />);

      expect(screen.getByPlaceholderText('custom.large')).toHaveValue('test-it');
    });

    it('updates name', () => {
      const onChange = vi.fn();
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('custom.large'), {
        target: { value: 'new-it' },
      });

      expect(onChange).toHaveBeenCalled();
      expect(onChange.mock.calls[0][0].metadata.name).toBe('new-it');
    });

    it('renders display name field', () => {
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Display Name')).toBeInTheDocument();
    });

    it('updates display name annotation', () => {
      const onChange = vi.fn();
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('Custom Large'), {
        target: { value: 'My Type' },
      });

      const updated = onChange.mock.calls[0][0];
      expect(updated.metadata.annotations['instancetype.kubevirt.io/displayName']).toBe('My Type');
    });

    it('clears annotation when display name emptied', () => {
      const onChange = vi.fn();
      const res = makeInstanceType({
        metadata: {
          name: 'test-it',
          annotations: { 'instancetype.kubevirt.io/displayName': 'Old Name' },
        },
      });
      render(<InstanceTypeForm resource={res} onChange={onChange} />);

      fireEvent.change(screen.getByPlaceholderText('Custom Large'), { target: { value: '' } });

      const updated = onChange.mock.calls[0][0];
      expect(updated.metadata.annotations).toBeUndefined();
    });

    it('renders description field', () => {
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });
  });

  // ─── CPU & Memory ───────────────────────────────────────────────────

  describe('CPU & Memory', () => {
    it('renders CPU cores field with value', () => {
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={vi.fn()} />);

      expect(screen.getByLabelText('CPU Cores *')).toHaveValue(4);
    });

    it('updates CPU cores as number', () => {
      const onChange = vi.fn();
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('CPU Cores *'), { target: { value: '8' } });

      expect(onChange.mock.calls[0][0].spec.cpu.guest).toBe(8);
    });

    it('clears CPU when emptied', () => {
      const onChange = vi.fn();
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('CPU Cores *'), { target: { value: '' } });

      expect(onChange.mock.calls[0][0].spec.cpu.guest).toBeUndefined();
    });

    it('renders memory field with value', () => {
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={vi.fn()} />);

      expect(screen.getByLabelText('Memory *')).toHaveValue(8);
    });

    it('updates memory with unit', () => {
      const onChange = vi.fn();
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={onChange} />);

      fireEvent.change(screen.getByLabelText('Memory *'), { target: { value: '16' } });

      expect(onChange.mock.calls[0][0].spec.memory.guest).toBe('16Gi');
    });

    it('handles Mi memory unit', () => {
      const onChange = vi.fn();
      const res = makeInstanceType({ spec: { cpu: { guest: 2 }, memory: { guest: '512Mi' } } });
      render(<InstanceTypeForm resource={res} onChange={onChange} />);

      expect(screen.getByLabelText('Memory *')).toHaveValue(512);
    });
  });

  // ─── Advanced CPU Options ───────────────────────────────────────────

  describe('Advanced CPU Options', () => {
    it('renders dedicated CPU placement switch', () => {
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={vi.fn()} />);

      expect(screen.getByText('Dedicated CPU Placement')).toBeInTheDocument();
    });

    it('toggles dedicated CPU placement', () => {
      const onChange = vi.fn();
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={onChange} />);

      fireEvent.click(getSwitch('Dedicated CPU Placement'));

      expect(onChange.mock.calls[0][0].spec.cpu.dedicatedCPUPlacement).toBe(true);
    });

    it('renders isolate emulator thread switch', () => {
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={vi.fn()} />);

      expect(screen.getByText('Isolate Emulator Thread')).toBeInTheDocument();
    });

    it('toggles isolate emulator thread', () => {
      const onChange = vi.fn();
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={onChange} />);

      fireEvent.click(getSwitch('Isolate Emulator Thread'));

      expect(onChange.mock.calls[0][0].spec.cpu.isolateEmulatorThread).toBe(true);
    });

    it('renders IO threads policy selector', () => {
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={vi.fn()} />);

      expect(screen.getByText('Controls how IO threads are allocated')).toBeInTheDocument();
    });
  });

  // ─── Memory Features ────────────────────────────────────────────────

  describe('Memory Features', () => {
    it('renders hugepages switch', () => {
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={vi.fn()} />);

      expect(screen.getByText('Use Hugepages')).toBeInTheDocument();
    });

    it('enables hugepages with default page size', () => {
      const onChange = vi.fn();
      render(<InstanceTypeForm resource={makeInstanceType()} onChange={onChange} />);

      fireEvent.click(getSwitch('Use Hugepages'));

      expect(onChange.mock.calls[0][0].spec.memory.hugepages).toEqual({ pageSize: '2Mi' });
    });

    it('shows hugepages size dropdown when enabled', () => {
      const res = makeInstanceType({
        spec: { cpu: { guest: 4 }, memory: { guest: '8Gi', hugepages: { pageSize: '2Mi' } } },
      });
      render(<InstanceTypeForm resource={res} onChange={vi.fn()} />);

      expect(screen.getByText('2 MiB')).toBeInTheDocument();
    });

    it('disables hugepages by removing the field', () => {
      const onChange = vi.fn();
      const res = makeInstanceType({
        spec: { cpu: { guest: 4 }, memory: { guest: '8Gi', hugepages: { pageSize: '2Mi' } } },
      });
      render(<InstanceTypeForm resource={res} onChange={onChange} />);

      fireEvent.click(getSwitch('Use Hugepages'));

      expect(onChange.mock.calls[0][0].spec.memory.hugepages).toBeUndefined();
    });
  });
});
