import assert from 'node:assert/strict';
import os from 'node:os';
import { it, mock } from 'node:test';

import { System } from '../../src/System.js';

// logicalCpuCount
it('logicalCpuCount is a positive integer', () => {
  const count = System.logicalCpuCount;

  assert.ok(typeof count === 'number', 'logicalCpuCount is a number');
  assert.ok(count > 0, `logicalCpuCount > 0, got ${String(count)}`);
  assert.ok(Number.isInteger(count), 'logicalCpuCount is an integer');
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
    description: 'optimalWorkerCount is logicalCpuCount - 1 clamped to 1',
    check: () => {
      const expected = Math.max(1, System.logicalCpuCount - 1);
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
      assert.equal(System.isAppleSilicon, expected);
    },
  },
];
for (const { description, check } of platformFieldScenarios) {
  it(description, check);
}

// isAppleSilicon
it('isAppleSilicon returns correct value for the current platform', () => {
  const expected = os.platform() === 'darwin' && os.arch() === 'arm64';
  assert.equal(System.isAppleSilicon, expected);
});

it('isAppleSilicon and platform.isAppleSilicon agree (shared detection logic)', () => {
  assert.equal(System.isAppleSilicon, System.platform.isAppleSilicon);
});

// snapshot()
it('snapshot resolves with cpu, gpu, memory, platform fields', async () => {
  const info = await System.snapshot();

  assert.ok(typeof info === 'object' && info !== null, 'snapshot is an object');
  assert.ok('cpu' in info, 'snapshot has cpu');
  assert.ok('gpu' in info, 'snapshot has gpu');
  assert.ok('memory' in info, 'snapshot has memory');
  assert.ok('platform' in info, 'snapshot has platform');

  // gpu may be null — that is valid
  assert.ok(info.gpu === null || typeof info.gpu === 'object', 'gpu is null or object');

  // spot-check nested values
  assert.ok(info.cpu.logicalCount > 0, 'snapshot.cpu.logicalCount > 0');
  assert.ok(info.memory.totalMb > 0, 'snapshot.memory.totalMb > 0');
  assert.equal(info.platform.nodeVersion, process.version);
});
