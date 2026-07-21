import assert from 'node:assert/strict';
import os from 'node:os';
import { it, mock } from 'node:test';

import type { GpuInfoEntity } from '../../src/entities/GpuInfoEntity.js';

import { System } from '../../src/System.js';
import { SystemProvider } from '../../src/providers/SystemProvider.js';

it('cpu.logicalCount is a positive integer', () => {
  const count = System.cpu.logicalCount;

  assert.ok(typeof count === 'number', 'cpu.logicalCount is a number');
  assert.ok(count > 0, `cpu.logicalCount > 0, got ${String(count)}`);
  assert.ok(Number.isInteger(count), 'cpu.logicalCount is an integer');
});

// optimalWorkerCount
const optimalWorkerScenarios: Array<{ description: string; check: () => void }> = [
  {
    description: 'optimalWorkerCount is at least 1',
    check: () => {
      const count = System.optimalWorkerCount;
      assert.ok(typeof count === 'number', 'optimalWorkerCount is a number');
      assert.ok(count >= 1, `optimalWorkerCount >= 1, got ${String(count)}`);
    },
  },
  {
    description: 'optimalWorkerCount is cpu.logicalCount - 1 clamped to 1',
    check: () => {
      const expected = Math.max(1, System.cpu.logicalCount - 1);
      assert.equal(System.optimalWorkerCount, expected);
    },
  },
];
for (const { description, check } of optimalWorkerScenarios) {
  it(description, check);
}

// cpu property field scenarios
const cpuFieldScenarios: Array<{ description: string; check: () => void }> = [
  {
    description: 'cpu.arch is a non-empty string',
    check: () => {
      const { arch } = System.cpu;
      assert.ok(typeof arch === 'string', 'arch is a string');
      assert.ok(arch.length > 0, 'arch is non-empty');
    },
  },
  {
    description: 'cpu.model is a non-empty string',
    check: () => {
      const { model } = System.cpu;
      assert.ok(typeof model === 'string', 'model is a string');
      assert.ok(model.length > 0, 'model is non-empty');
    },
  },
  {
    description: 'cpu.logicalCount matches os.cpus().length',
    check: () => {
      assert.equal(System.cpu.logicalCount, os.cpus().length);
    },
  },
  {
    description: 'cpu.physicalCount is >= 1 and <= logicalCount',
    check: () => {
      const { logicalCount, physicalCount } = System.cpu;
      assert.ok(physicalCount >= 1, `physicalCount >= 1, got ${String(physicalCount)}`);
      assert.ok(physicalCount <= logicalCount, 'physicalCount <= logicalCount');
    },
  },
  {
    description:
      'cpu.physicalCount equals logicalCount regardless of arch (no unreliable hyperthreading halving)',
    check: () => {
      const { logicalCount, physicalCount } = System.cpu;
      assert.equal(
        physicalCount,
        logicalCount,
        'physicalCount must not be halved by an arch-based hyperthreading guess',
      );
    },
  },
];
for (const { description, check } of cpuFieldScenarios) {
  it(description, check);
}

it('cpu getter enumerates os.cpus() exactly once per access', () => {
  const spy = mock.method(os, 'cpus');

  try {
    void System.cpu;
    assert.equal(spy.mock.callCount(), 1, 'os.cpus() should be called exactly once per cpu access');
  } finally {
    spy.mock.restore();
  }
});

// memory property field scenarios
const memoryFieldScenarios: Array<{ description: string; check: () => void }> = [
  {
    description: 'memory.totalMb is > 0',
    check: () => {
      const { totalMb } = System.memory;
      assert.ok(typeof totalMb === 'number', 'totalMb is a number');
      assert.ok(totalMb > 0, `totalMb > 0, got ${String(totalMb)}`);
    },
  },
  {
    description: 'memory.freeMb is >= 0 and <= totalMb',
    check: () => {
      const { freeMb, totalMb } = System.memory;
      assert.ok(freeMb >= 0, `freeMb >= 0, got ${String(freeMb)}`);
      assert.ok(freeMb <= totalMb, 'freeMb <= totalMb');
    },
  },
];
for (const { description, check } of memoryFieldScenarios) {
  it(description, check);
}

// platform property field scenarios
const platformFieldScenarios: Array<{ description: string; check: () => void }> = [
  {
    description: 'platform.nodeVersion matches process.version',
    check: () => {
      assert.equal(System.platform.nodeVersion, process.version);
    },
  },
  {
    description: 'platform.os is a non-empty string',
    check: () => {
      const { os: platformOs } = System.platform;
      assert.ok(typeof platformOs === 'string', 'os is a string');
      assert.ok(platformOs.length > 0, 'os is non-empty');
    },
  },
  {
    description: 'platform.isAppleSilicon matches darwin + arm64',
    check: () => {
      const expected = os.platform() === 'darwin' && os.arch() === 'arm64';
      assert.equal(System.platform.isAppleSilicon, expected);
    },
  },
];
for (const { description, check } of platformFieldScenarios) {
  it(description, check);
}

it('gpu caches detection without exposing the cached object', () => {
  const detectGpu = mock.method(
    SystemProvider.prototype,
    'detectGpu',
    (): GpuInfoEntity.Type => ({ 'computeApi': 'software', 'name': 'Test GPU', 'vramMb': 512 })
  );

  try {
    const first = System.gpu();
    if (first === null) {
      throw new Error('mocked GPU detection returned null');
    }
    Reflect.set(first, 'name', 'tampered');

    const second = System.gpu();
    if (second === null) {
      throw new Error('cached GPU detection returned null');
    }
    assert.equal(second.name, 'Test GPU');
    assert.equal(detectGpu.mock.callCount(), 1);
  } finally {
    detectGpu.mock.restore();
  }
});
