import { RuntimeError } from '@studnicky/errors';
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

import scenarioGroups from './System.scenarios.json' with { type: 'json' };

type SystemScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

function numberInput(expected: Record<string, unknown>, key: string): number {
  const value = expected[key];
  if (typeof value !== 'number') {
    throw RuntimeError.create(`expected.${key} must be a number`);
  }
  return value;
}

function stringInput(expected: Record<string, unknown>, key: string): string {
  const value = expected[key];
  if (typeof value !== 'string') {
    throw RuntimeError.create(`expected.${key} must be a string`);
  }
  return value;
}

function booleanInput(expected: Record<string, unknown>, key: string): boolean {
  const value = expected[key];
  if (typeof value !== 'boolean') {
    throw RuntimeError.create(`expected.${key} must be a boolean`);
  }
  return value;
}

const scenarioRunners: Record<SystemScenarioShape, SystemScenarioRunner> = {
  'cpu-logical-count-positive': (scenarioCase) => {
    const count = System.cpu.logicalCount;
    assert.ok(typeof count === 'number');
    assert.ok(Number.isInteger(count));
    assert.ok(count >= numberInput(scenarioCase.expected, 'minimum'));
  },

  'optimal-worker-count-at-least-1': (scenarioCase) => {
    const count = System.optimalWorkerCount;
    assert.ok(typeof count === 'number');
    assert.ok(count >= numberInput(scenarioCase.expected, 'minimum'));
  },

  'optimal-worker-count-clamped': (scenarioCase) => {
    const formulaByExpression: Record<string, () => number> = {
      'max(1, cpu.logicalCount - 1)': () => Math.max(1, System.cpu.logicalCount - 1)
    };
    const formula = stringInput(scenarioCase.expected, 'formula');
    const compute = formulaByExpression[formula];
    assert.ok(compute !== undefined, `unknown formula: ${formula}`);
    assert.equal(System.optimalWorkerCount, compute());
  },

  'cpu-arch-non-empty': (scenarioCase) => {
    const { arch } = System.cpu;
    assert.ok(typeof arch === 'string');
    assert.equal(arch.length > 0, booleanInput(scenarioCase.expected, 'nonEmpty'));
  },

  'cpu-model-non-empty': (scenarioCase) => {
    const { model } = System.cpu;
    assert.ok(typeof model === 'string');
    assert.equal(model.length > 0, booleanInput(scenarioCase.expected, 'nonEmpty'));
  },

  'cpu-logical-count-matches-os': (scenarioCase) => {
    const sourceByExpression: Record<string, () => number> = {
      'os.cpus().length': () => os.cpus().length
    };
    const source = stringInput(scenarioCase.expected, 'source');
    const compute = sourceByExpression[source];
    assert.ok(compute !== undefined, `unknown source: ${source}`);
    assert.equal(System.cpu.logicalCount, compute());
  },

  'cpu-physical-count-range': (scenarioCase) => {
    const { logicalCount, physicalCount } = System.cpu;
    assert.ok(physicalCount >= numberInput(scenarioCase.expected, 'minimum'));
    const referenceByName: Record<string, number> = { logicalCount };
    const maximumRef = stringInput(scenarioCase.expected, 'maximum');
    const maximum = referenceByName[maximumRef];
    assert.ok(maximum !== undefined, `unknown maximum reference: ${maximumRef}`);
    assert.ok(physicalCount <= maximum);
  },

  'cpu-physical-count-equals-logical-count': (scenarioCase) => {
    const { logicalCount, physicalCount } = System.cpu;
    const relationByName: Record<string, (a: number, b: number) => boolean> = {
      'equal': (a, b) => a === b
    };
    const relation = stringInput(scenarioCase.expected, 'relation');
    const compare = relationByName[relation];
    assert.ok(compare !== undefined, `unknown relation: ${relation}`);
    assert.equal(compare(physicalCount, logicalCount), true);
  },

  'cpu-getter-calls-os-cpus-once': (scenarioCase) => {
    const spy = mock.method(os, 'cpus');
    try {
      void System.cpu;
      assert.equal(spy.mock.callCount(), numberInput(scenarioCase.expected, 'callCount'));
    } finally {
      spy.mock.restore();
    }
  },

  'memory-total-positive': (scenarioCase) => {
    const { totalMb } = System.memory;
    assert.ok(typeof totalMb === 'number');
    assert.ok(totalMb >= numberInput(scenarioCase.expected, 'minimum'));
  },

  'memory-free-range': (scenarioCase) => {
    const { freeMb, totalMb } = System.memory;
    assert.ok(freeMb >= numberInput(scenarioCase.expected, 'minimum'));
    const referenceByName: Record<string, number> = { totalMb };
    const maximumRef = stringInput(scenarioCase.expected, 'maximum');
    const maximum = referenceByName[maximumRef];
    assert.ok(maximum !== undefined, `unknown maximum reference: ${maximumRef}`);
    assert.ok(freeMb <= maximum);
  },

  'platform-node-version': (scenarioCase) => {
    const sourceByExpression: Record<string, () => string> = {
      'process.version': () => process.version
    };
    const source = stringInput(scenarioCase.expected, 'source');
    const compute = sourceByExpression[source];
    assert.ok(compute !== undefined, `unknown source: ${source}`);
    assert.equal(System.platform.nodeVersion, compute());
  },

  'platform-os-non-empty': (scenarioCase) => {
    const { os: platformOs } = System.platform;
    assert.ok(typeof platformOs === 'string');
    assert.equal(platformOs.length > 0, booleanInput(scenarioCase.expected, 'nonEmpty'));
  },

  'platform-is-apple-silicon': (scenarioCase) => {
    const formulaByExpression: Record<string, () => boolean> = {
      'darwin && arm64': () => os.platform() === 'darwin' && os.arch() === 'arm64'
    };
    const formula = stringInput(scenarioCase.expected, 'formula');
    const compute = formulaByExpression[formula];
    assert.ok(compute !== undefined, `unknown formula: ${formula}`);
    assert.equal(System.platform.isAppleSilicon, compute());
  },

  'gpu-caches-detection': (scenarioCase) => {
    const { detectedGpu } = scenarioCase.input.system;
    if (detectedGpu === undefined) {
      throw RuntimeError.create('gpu-caches-detection requires input.system.detectedGpu');
    }
    const detectGpu = mock.method(
      SystemProvider.prototype,
      'detectGpu',
      (): GpuInfoEntity.Type => detectedGpu
    );

    try {
      const first = System.gpu();
      if (first === null) {
        throw RuntimeError.create('mocked GPU detection returned null');
      }
      Reflect.set(first, 'name', 'tampered');

      const second = System.gpu();
      if (second === null) {
        throw RuntimeError.create('cached GPU detection returned null');
      }
      assert.equal(detectGpu.mock.callCount(), numberInput(scenarioCase.expected, 'callCount'));
      const cachedWithoutExposingMutation = detectGpu.mock.callCount() === 1 && second.name === detectedGpu.name;
      assert.equal(cachedWithoutExposingMutation, booleanInput(scenarioCase.expected, 'cached'));
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
