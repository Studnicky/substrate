import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import os from 'node:os';
import { mock } from 'node:test';

import type { GpuInfoEntity } from '../../src/entities/GpuInfoEntity.js';

import { SystemProvider } from '../../src/providers/SystemProvider.js';
import { System } from '../../src/System.js';
import { SystemScenarioCaseEntity } from './entities/SystemScenarioCaseEntity.js';
import scenarioGroups from './System.scenarios.json' with { 'type': 'json' };

class SystemRunners {
  static 'cpu-arch-non-empty'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'cpu-arch-non-empty'>): void {
    const { arch } = System.cpu;
    assert.ok(typeof arch === 'string');
    assert.equal(arch.length > 0, scenarioCase.expected.nonEmpty);
  }

  static 'cpu-getter-calls-os-cpus-once'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'cpu-getter-calls-os-cpus-once'>): void {
    const spy = mock.method(os, 'cpus');
    try {
      const cpu = System.cpu;
      assert.ok(typeof cpu.logicalCount === 'number');
      assert.equal(spy.mock.callCount(), scenarioCase.expected.callCount);
    } finally {
      spy.mock.restore();
    }
  }

  static 'cpu-logical-count-matches-os'(_scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'cpu-logical-count-matches-os'>): void {
    assert.equal(System.cpu.logicalCount, os.cpus().length);
  }

  static 'cpu-logical-count-positive'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'cpu-logical-count-positive'>): void {
    const count = System.cpu.logicalCount;
    assert.ok(typeof count === 'number');
    assert.ok(Number.isInteger(count));
    assert.ok(count >= scenarioCase.expected.minimum);
  }

  static 'cpu-model-non-empty'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'cpu-model-non-empty'>): void {
    const { model } = System.cpu;
    assert.ok(typeof model === 'string');
    assert.equal(model.length > 0, scenarioCase.expected.nonEmpty);
  }

  static 'cpu-physical-count-equals-logical-count'(_scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'cpu-physical-count-equals-logical-count'>): void {
    const { logicalCount, physicalCount } = System.cpu;
    assert.equal(physicalCount === logicalCount, true);
  }

  static 'cpu-physical-count-range'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'cpu-physical-count-range'>): void {
    const { logicalCount, physicalCount } = System.cpu;
    assert.ok(physicalCount >= scenarioCase.expected.minimum);
    assert.ok(physicalCount <= logicalCount);
  }

  static 'gpu-caches-detection'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'gpu-caches-detection'>): void {
    const { detectedGpu } = scenarioCase.input.system;
    const detectGpu = mock.method(
      SystemProvider.prototype,
      'detectGpu',
      (): GpuInfoEntity.Type => {
        const detected: GpuInfoEntity.Type = detectedGpu;
        return detected;
      }
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
      assert.equal(detectGpu.mock.callCount(), scenarioCase.expected.callCount);
      const cachedWithoutExposingMutation = detectGpu.mock.callCount() === 1 && second.name === detectedGpu.name;
      assert.equal(cachedWithoutExposingMutation, scenarioCase.expected.cached);
    } finally {
      detectGpu.mock.restore();
    }
  }

  static 'memory-free-range'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'memory-free-range'>): void {
    const { freeMb, totalMb } = System.memory;
    assert.ok(freeMb >= scenarioCase.expected.minimum);
    assert.ok(freeMb <= totalMb);
  }

  static 'memory-total-positive'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'memory-total-positive'>): void {
    const { totalMb } = System.memory;
    assert.ok(typeof totalMb === 'number');
    assert.ok(totalMb >= scenarioCase.expected.minimum);
  }

  static 'optimal-worker-count-at-least-1'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'optimal-worker-count-at-least-1'>): void {
    const count = System.optimalWorkerCount;
    assert.ok(typeof count === 'number');
    assert.ok(count >= scenarioCase.expected.minimum);
  }

  static 'optimal-worker-count-clamped'(_scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'optimal-worker-count-clamped'>): void {
    assert.equal(System.optimalWorkerCount, Math.max(1, System.cpu.logicalCount - 1));
  }

  static 'platform-is-apple-silicon'(_scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'platform-is-apple-silicon'>): void {
    assert.equal(System.platform.isAppleSilicon, os.platform() === 'darwin' && os.arch() === 'arm64');
  }

  static 'platform-node-version'(_scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'platform-node-version'>): void {
    assert.equal(System.platform.nodeVersion, process.version);
  }

  static 'platform-os-non-empty'(scenarioCase: ScenarioCaseOfType<SystemScenarioCaseEntity.Type, 'platform-os-non-empty'>): void {
    const { 'os': platformOs } = System.platform;
    assert.ok(typeof platformOs === 'string');
    assert.equal(platformOs.length > 0, scenarioCase.expected.nonEmpty);
  }
}

ScenarioSuite.register({
  'entity': SystemScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'System',
  'runners': SystemRunners
});
