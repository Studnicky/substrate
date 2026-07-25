import assert from 'node:assert/strict';
import os from 'node:os';
import { describe, it, mock } from 'node:test';

import type { GpuInfoEntity } from '../../src/entities/GpuInfoEntity.js';

import { System } from '../../src/System.js';
import { SystemProvider } from '../../src/providers/SystemProvider.js';

type ScenarioCase =
  | {
    description: string;
    expected: Record<string, unknown>;
    input: { system: { detectedGpu?: GpuInfoEntity.Type } };
    shape: SystemScenarioShape;
    name: string;
  };

type SystemScenarioShape =
  | 'cpu-logical-count-positive'
  | 'optimal-worker-count-at-least-1'
  | 'optimal-worker-count-clamped'
  | 'cpu-arch-non-empty'
  | 'cpu-model-non-empty'
  | 'cpu-logical-count-matches-os'
  | 'cpu-physical-count-range'
  | 'cpu-physical-count-equals-logical-count'
  | 'cpu-getter-calls-os-cpus-once'
  | 'memory-total-positive'
  | 'memory-free-range'
  | 'platform-node-version'
  | 'platform-os-non-empty'
  | 'platform-is-apple-silicon'
  | 'gpu-caches-detection';

import scenarioGroups from './System.scenarios.json';

type SystemScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

const scenarioRunners: Record<SystemScenarioShape, SystemScenarioRunner> = {
  'cpu-logical-count-positive': () => {
    const count = System.cpu.logicalCount;
    assert.ok(typeof count === 'number');
    assert.ok(count > 0);
    assert.ok(Number.isInteger(count));
  },

  'optimal-worker-count-at-least-1': () => {
    const count = System.optimalWorkerCount;
    assert.ok(typeof count === 'number');
    assert.ok(count >= 1);
  },

  'optimal-worker-count-clamped': () => {
    const expected = Math.max(1, System.cpu.logicalCount - 1);
    assert.equal(System.optimalWorkerCount, expected);
  },

  'cpu-arch-non-empty': () => {
    const { arch } = System.cpu;
    assert.ok(typeof arch === 'string');
    assert.ok(arch.length > 0);
  },

  'cpu-model-non-empty': () => {
    const { model } = System.cpu;
    assert.ok(typeof model === 'string');
    assert.ok(model.length > 0);
  },

  'cpu-logical-count-matches-os': () => {
    assert.equal(System.cpu.logicalCount, os.cpus().length);
  },

  'cpu-physical-count-range': () => {
    const { logicalCount, physicalCount } = System.cpu;
    assert.ok(physicalCount >= 1);
    assert.ok(physicalCount <= logicalCount);
  },

  'cpu-physical-count-equals-logical-count': () => {
    const { logicalCount, physicalCount } = System.cpu;
    assert.equal(physicalCount, logicalCount);
  },

  'cpu-getter-calls-os-cpus-once': () => {
    const spy = mock.method(os, 'cpus');
    try {
      void System.cpu;
      assert.equal(spy.mock.callCount(), 1);
    } finally {
      spy.mock.restore();
    }
  },

  'memory-total-positive': () => {
    const { totalMb } = System.memory;
    assert.ok(typeof totalMb === 'number');
    assert.ok(totalMb > 0);
  },

  'memory-free-range': () => {
    const { freeMb, totalMb } = System.memory;
    assert.ok(freeMb >= 0);
    assert.ok(freeMb <= totalMb);
  },

  'platform-node-version': () => {
    assert.equal(System.platform.nodeVersion, process.version);
  },

  'platform-os-non-empty': () => {
    const { os: platformOs } = System.platform;
    assert.ok(typeof platformOs === 'string');
    assert.ok(platformOs.length > 0);
  },

  'platform-is-apple-silicon': () => {
    const expected = os.platform() === 'darwin' && os.arch() === 'arm64';
    assert.equal(System.platform.isAppleSilicon, expected);
  },

  'gpu-caches-detection': (scenarioCase) => {
    const { detectedGpu } = scenarioCase.input.system;
    if (detectedGpu === undefined) {
      throw new Error('gpu-caches-detection requires input.system.detectedGpu');
    }
    const detectGpu = mock.method(
      SystemProvider.prototype,
      'detectGpu',
      (): GpuInfoEntity.Type => detectedGpu
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
      assert.equal(second.name, detectedGpu.name);
      assert.equal(detectGpu.mock.callCount(), 1);
    } finally {
      detectGpu.mock.restore();
    }
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await scenarioRunners[scenarioCase.shape](scenarioCase);
}

void describe('System', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
