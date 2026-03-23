/**
 * Workflow tests — simulate a user creating a full preference end-to-end.
 */
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import PreferenceForm from './PreferenceForm';

function FormWrapper({ initial }: { initial: any }) {
  const [resource, setResource] = useState(initial);
  return (
    <>
      <PreferenceForm resource={resource} onChange={setResource} />
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

const INITIAL_PREF = {
  apiVersion: 'instancetype.kubevirt.io/v1beta1',
  kind: 'VirtualMachineClusterPreference',
  metadata: { name: '' },
  spec: {
    devices: {
      preferredDiskBus: 'virtio',
      preferredInterfaceModel: 'virtio',
    },
  },
};

describe('PreferenceForm Workflows', () => {
  it('creates a Windows preference with EFI, secure boot, SMM, and min requirements', () => {
    render(<FormWrapper initial={INITIAL_PREF} />);

    // Step 1: Name
    fireEvent.change(screen.getByLabelText('Name *'), {
      target: { value: 'windows.11' },
    });

    // Step 2: Enable EFI (must come before secure boot appears)
    fireEvent.click(getSwitch('Use EFI Boot'));

    // Step 3: Enable secure boot (now visible because EFI is on)
    fireEvent.click(getSwitch('Enable Secure Boot'));

    // Step 4: Enable SMM (required for Windows secure boot)
    fireEvent.click(getSwitch('Enable SMM (System Management Mode)'));

    // Step 5: Enable IO thread and input device
    fireEvent.click(getSwitch('Disk Dedicated IO Thread'));
    fireEvent.click(getSwitch('Auto-attach Input Device'));

    // Step 6: Enable minimum requirements
    fireEvent.click(getSwitch('Specify Minimum Requirements'));

    // Step 7: Set minimum CPU to 4 and memory to 8Gi
    fireEvent.change(screen.getByLabelText('Minimum CPU Cores'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('Minimum Memory'), {
      target: { value: '8' },
    });

    // ── Verify complete resource ──
    const resource = getResource();
    expect(resource.metadata.name).toBe('windows.11');
    expect(resource.spec.firmware.preferredEfi.secureBoot).toBe(true);
    expect(resource.spec.features).toEqual({ preferredSmm: {} });
    expect(resource.spec.devices.preferredDiskDedicatedIoThread).toBe(true);
    expect(resource.spec.devices.preferredAutoattachInputDevice).toBe(true);
    expect(resource.spec.requirements.cpu.guest).toBe(4);
    expect(resource.spec.requirements.memory.guest).toBe('8Gi');
  });

  it('creates a minimal Linux preference', () => {
    render(<FormWrapper initial={INITIAL_PREF} />);

    // Just name and defaults
    fireEvent.change(screen.getByLabelText('Name *'), {
      target: { value: 'linux.generic' },
    });

    // ── Verify: minimal resource, no firmware or requirements ──
    const resource = getResource();
    expect(resource.metadata.name).toBe('linux.generic');
    expect(resource.spec.devices.preferredDiskBus).toBe('virtio');
    expect(resource.spec.devices.preferredInterfaceModel).toBe('virtio');
    expect(resource.spec.firmware).toBeUndefined();
    expect(resource.spec.features).toBeUndefined();
    expect(resource.spec.requirements).toBeUndefined();
  });

  it('enables then disables EFI — secure boot field disappears and firmware is cleaned', () => {
    render(<FormWrapper initial={INITIAL_PREF} />);

    fireEvent.change(screen.getByLabelText('Name *'), {
      target: { value: 'test-toggle' },
    });

    // Enable EFI
    fireEvent.click(getSwitch('Use EFI Boot'));
    expect(screen.getByText('Enable Secure Boot')).toBeInTheDocument();

    // Enable Secure Boot
    fireEvent.click(getSwitch('Enable Secure Boot'));
    expect(getResource().spec.firmware.preferredEfi.secureBoot).toBe(true);

    // Disable EFI — should remove firmware entirely
    fireEvent.click(getSwitch('Use EFI Boot'));
    expect(screen.queryByText('Enable Secure Boot')).not.toBeInTheDocument();
    expect(getResource().spec.firmware).toBeUndefined();
  });

  it('enables then disables minimum requirements — fields disappear and data is cleaned', () => {
    render(<FormWrapper initial={INITIAL_PREF} />);

    fireEvent.change(screen.getByLabelText('Name *'), {
      target: { value: 'test-toggle-req' },
    });

    // Enable min requirements — defaults appear
    fireEvent.click(getSwitch('Specify Minimum Requirements'));
    expect(screen.getByLabelText('Minimum CPU Cores')).toHaveValue(1);
    expect(screen.getByLabelText('Minimum Memory')).toHaveValue(1);

    // Modify them
    fireEvent.change(screen.getByLabelText('Minimum CPU Cores'), {
      target: { value: '16' },
    });

    // Disable — fields removed from resource
    fireEvent.click(getSwitch('Specify Minimum Requirements'));
    expect(screen.queryByLabelText('Minimum CPU Cores')).not.toBeInTheDocument();
    expect(getResource().spec.requirements).toBeUndefined();
  });
});
