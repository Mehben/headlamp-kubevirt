/**
 * Workflow tests — simulate a user creating a full instance type end-to-end.
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import InstanceTypeForm from './InstanceTypeForm';

function FormWrapper({ initial }: { initial: any }) {
  const [resource, setResource] = useState(initial);
  return (
    <>
      <InstanceTypeForm resource={resource} onChange={setResource} />
      <div data-testid="resource-snapshot">{JSON.stringify(resource)}</div>
    </>
  );
}

function getResource(): any {
  return JSON.parse(screen.getByTestId('resource-snapshot').textContent!);
}

function getSwitch(labelText: string): HTMLInputElement {
  const labelEl = screen.getByText(labelText);
  const fcl = labelEl.closest('.MuiFormControlLabel-root');
  if (!fcl) throw new Error(`No FormControlLabel for "${labelText}"`);
  const input = fcl.querySelector('input[type="checkbox"]') as HTMLInputElement;
  if (!input) throw new Error(`No checkbox for "${labelText}"`);
  return input;
}

const INITIAL_IT = {
  apiVersion: 'instancetype.kubevirt.io/v1beta1',
  kind: 'VirtualMachineClusterInstancetype',
  metadata: { name: '' },
  spec: {
    cpu: { guest: '' },
    memory: { guest: '' },
  },
};

describe('InstanceTypeForm Workflows', () => {
  it('creates a basic instance type with CPU and memory', () => {
    render(<FormWrapper initial={INITIAL_IT} />);

    // Step 1: Basic info
    fireEvent.change(screen.getByPlaceholderText('custom.large'), {
      target: { value: 'gpu.xlarge' },
    });
    fireEvent.change(screen.getByPlaceholderText('Custom Large'), {
      target: { value: 'GPU X-Large' },
    });

    // Step 2: CPU and memory
    fireEvent.change(screen.getByLabelText('CPU Cores *'), {
      target: { value: '16' },
    });
    fireEvent.change(screen.getByLabelText('Memory *'), {
      target: { value: '64' },
    });

    // ── Verify ──
    const resource = getResource();
    expect(resource.metadata.name).toBe('gpu.xlarge');
    expect(resource.metadata.annotations['instancetype.kubevirt.io/displayName']).toBe(
      'GPU X-Large'
    );
    expect(resource.spec.cpu.guest).toBe(16);
    expect(resource.spec.memory.guest).toBe('64Gi');
  });

  it('creates a high-performance instance type with dedicated CPU and hugepages', () => {
    render(<FormWrapper initial={INITIAL_IT} />);

    // Step 1: Name
    fireEvent.change(screen.getByPlaceholderText('custom.large'), {
      target: { value: 'perf.dedicated' },
    });

    // Step 2: CPU and memory
    fireEvent.change(screen.getByLabelText('CPU Cores *'), {
      target: { value: '8' },
    });
    fireEvent.change(screen.getByLabelText('Memory *'), {
      target: { value: '32' },
    });

    // Step 3: Enable dedicated CPU placement
    fireEvent.click(getSwitch('Dedicated CPU Placement'));

    // Step 4: Enable isolate emulator thread
    fireEvent.click(getSwitch('Isolate Emulator Thread'));

    // Step 5: Enable hugepages
    fireEvent.click(getSwitch('Use Hugepages'));

    // ── Verify ──
    const resource = getResource();
    expect(resource.metadata.name).toBe('perf.dedicated');
    expect(resource.spec.cpu.guest).toBe(8);
    expect(resource.spec.cpu.dedicatedCPUPlacement).toBe(true);
    expect(resource.spec.cpu.isolateEmulatorThread).toBe(true);
    expect(resource.spec.memory.guest).toBe('32Gi');
    expect(resource.spec.memory.hugepages).toEqual({ pageSize: '2Mi' });
  });

  it('creates a small instance type with MiB memory', () => {
    render(<FormWrapper initial={INITIAL_IT} />);

    fireEvent.change(screen.getByPlaceholderText('custom.large'), {
      target: { value: 'micro.tiny' },
    });

    fireEvent.change(screen.getByLabelText('CPU Cores *'), {
      target: { value: '1' },
    });

    // Set memory to 512
    fireEvent.change(screen.getByLabelText('Memory *'), {
      target: { value: '512' },
    });

    // ── Verify ──
    const resource = getResource();
    expect(resource.metadata.name).toBe('micro.tiny');
    expect(resource.spec.cpu.guest).toBe(1);
    // Default unit is Gi
    expect(resource.spec.memory.guest).toBe('512Gi');
  });
});
