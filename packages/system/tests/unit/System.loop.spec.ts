import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import os from 'node:os';
import { describe, it, mock } from 'node:test';

import { SystemProvider } from '#provider';

import type { GpuInfoEntity } from '../../src/entities/GpuInfoEntity.js';

import { System } from '../../src/System.js';
import scenarioGroups from './System.scenarios.json' with { 'type': 'json' };

interface SystemScenarioSystemInterface {
  readonly 'detectedGpu'?: GpuInfoEntity.Type;
}

interface SystemScenarioInputInterface {
  readonly 'system': SystemScenarioSystemInterface;
}

interface SystemScenarioInterface {
  readonly 'description': string;
  readonly 'expected': Record<string, unknown>;
  readonly 'input': SystemScenarioInputInterface;
  readonly 'name': string;
  readonly 'shape': string;
}

class SystemScenarioExpected {
  static numberInput(expected: Record<string, unknown>, key: string): number {
    const value = expected[key];
    if (typeof value !== 'number') {
      throw RuntimeError.create(`expected.${key} must be a number`);
    }
    return value;
  }

  static stringInput(expected: Record<string, unknown>, key: string): string {
    const value = expected[key];
    if (typeof value !== 'string') {
      throw RuntimeError.create(`expected.${key} must be a string`);
    }
    return value;
  }

  static booleanInput(expected: Record<string, unknown>, key: string): boolean {
    const value = expected[key];
    if (typeof value !== 'boolean') {
      throw RuntimeError.create(`expected.${key} must be a boolean`);
    }
    return value;
  }

  static resolveCpuReference(reference: string, logicalCount: number): number {
    assert.equal(reference, 'logicalCount', `unknown maximum reference: ${reference}`);
    return logicalCount;
  }

  static resolveMemoryReference(reference: string, totalMb: number): number {
    assert.equal(reference, 'totalMb', `unknown maximum reference: ${reference}`);
    return totalMb;
  }
}

class SystemScenarioRunners {
  static 'cpu-arch-non-empty'(scenarioCase: SystemScenarioInterface): void {
    const { arch } = System.cpu;
    assert.ok(typeof arch === 'string');
    assert.equal(arch.length > 0, SystemScenarioExpected.booleanInput(scenarioCase.expected, 'nonEmpty'));
  }

  static 'cpu-getter-calls-os-cpus-once'(scenarioCase: SystemScenarioInterface): void {
    const spy = mock.method(os, 'cpus');
    try {
      assert.equal(typeof System.cpu, 'object');
      assert.equal(spy.mock.callCount(), SystemScenarioExpected.numberInput(scenarioCase.expected, 'callCount'));
    } finally {
      spy.mock.restore();
    }
  }

  static 'cpu-logical-count-matches-os'(scenarioCase: SystemScenarioInterface): void {
    const source = SystemScenarioExpected.stringInput(scenarioCase.expected, 'source');
    assert.equal(source, 'os.cpus().length', `unknown source: ${source}`);
    assert.equal(System.cpu.logicalCount, os.cpus().length);
  }

  static 'cpu-logical-count-positive'(scenarioCase: SystemScenarioInterface): void {
    const count = System.cpu.logicalCount;
    assert.ok(typeof count === 'number');
    assert.ok(Number.isInteger(count));
    assert.ok(count >= SystemScenarioExpected.numberInput(scenarioCase.expected, 'minimum'));
  }

  static 'cpu-model-non-empty'(scenarioCase: SystemScenarioInterface): void {
    const { model } = System.cpu;
    assert.ok(typeof model === 'string');
    assert.equal(model.length > 0, SystemScenarioExpected.booleanInput(scenarioCase.expected, 'nonEmpty'));
  }

  static 'cpu-physical-count-equals-logical-count'(scenarioCase: SystemScenarioInterface): void {
    const { logicalCount, physicalCount } = System.cpu;
    const relation = SystemScenarioExpected.stringInput(scenarioCase.expected, 'relation');
    assert.equal(relation, 'equal', `unknown relation: ${relation}`);
    assert.equal(physicalCount, logicalCount);
  }

  static 'cpu-physical-count-range'(scenarioCase: SystemScenarioInterface): void {
    const { logicalCount, physicalCount } = System.cpu;
    assert.ok(physicalCount >= SystemScenarioExpected.numberInput(scenarioCase.expected, 'minimum'));
    const maximumReference = SystemScenarioExpected.stringInput(scenarioCase.expected, 'maximum');
    const maximum = SystemScenarioExpected.resolveCpuReference(maximumReference, logicalCount);
    assert.ok(physicalCount <= maximum);
  }

  static 'gpu-caches-detection'(scenarioCase: SystemScenarioInterface): void {
    const { detectedGpu } = scenarioCase.input.system;
    if (detectedGpu === undefined) {
      throw RuntimeError.create('gpu-caches-detection requires input.system.detectedGpu');
    }
    const detectGpu = mock.method(
      SystemProvider.prototype,
      'detectGpu',
      (): GpuInfoEntity.Type => {return detectedGpu;}
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
      assert.equal(detectGpu.mock.callCount(), SystemScenarioExpected.numberInput(scenarioCase.expected, 'callCount'));
      const cachedWithoutExposingMutation = detectGpu.mock.callCount() === 1 && second.name === detectedGpu.name;
      assert.equal(cachedWithoutExposingMutation, SystemScenarioExpected.booleanInput(scenarioCase.expected, 'cached'));
    } finally {
      detectGpu.mock.restore();
    }
  }

  static 'memory-free-range'(scenarioCase: SystemScenarioInterface): void {
    const { freeMb, totalMb } = System.memory;
    assert.ok(freeMb >= SystemScenarioExpected.numberInput(scenarioCase.expected, 'minimum'));
    const maximumReference = SystemScenarioExpected.stringInput(scenarioCase.expected, 'maximum');
    const maximum = SystemScenarioExpected.resolveMemoryReference(maximumReference, totalMb);
    assert.ok(freeMb <= maximum);
  }

  static 'memory-total-positive'(scenarioCase: SystemScenarioInterface): void {
    const { totalMb } = System.memory;
    assert.ok(typeof totalMb === 'number');
    assert.ok(totalMb >= SystemScenarioExpected.numberInput(scenarioCase.expected, 'minimum'));
  }

  static 'optimal-worker-count-at-least-1'(scenarioCase: SystemScenarioInterface): void {
    const count = System.optimalWorkerCount;
    assert.ok(typeof count === 'number');
    assert.ok(count >= SystemScenarioExpected.numberInput(scenarioCase.expected, 'minimum'));
  }

  static 'optimal-worker-count-clamped'(scenarioCase: SystemScenarioInterface): void {
    const formula = SystemScenarioExpected.stringInput(scenarioCase.expected, 'formula');
    assert.equal(formula, 'max(1, cpu.logicalCount - 1)', `unknown formula: ${formula}`);
    assert.equal(System.optimalWorkerCount, Math.max(1, System.cpu.logicalCount - 1));
  }

  static 'platform-is-apple-silicon'(scenarioCase: SystemScenarioInterface): void {
    const formula = SystemScenarioExpected.stringInput(scenarioCase.expected, 'formula');
    assert.equal(formula, 'darwin && arm64', `unknown formula: ${formula}`);
    assert.equal(System.platform.isAppleSilicon, os.platform() === 'darwin' && os.arch() === 'arm64');
  }

  static 'platform-node-version'(scenarioCase: SystemScenarioInterface): void {
    const source = SystemScenarioExpected.stringInput(scenarioCase.expected, 'source');
    assert.equal(source, 'process.version', `unknown source: ${source}`);
    assert.equal(System.platform.nodeVersion, process.version);
  }

  static 'platform-os-non-empty'(scenarioCase: SystemScenarioInterface): void {
    const { 'os': platformOs } = System.platform;
    assert.ok(typeof platformOs === 'string');
    assert.equal(platformOs.length > 0, SystemScenarioExpected.booleanInput(scenarioCase.expected, 'nonEmpty'));
  }
}

class SystemScenarioDispatcher {
  static isKnownShape(shape: string): shape is Exclude<keyof typeof SystemScenarioRunners, 'prototype'> {
    const isKnown = Object.hasOwn(SystemScenarioRunners, shape);
    return isKnown;
  }

  static run(scenarioCase: SystemScenarioInterface): void {
    const { shape } = scenarioCase;
    assert.ok(SystemScenarioDispatcher.isKnownShape(shape), `unknown scenario shape: ${shape}`);
    SystemScenarioRunners[shape](scenarioCase);
  }
}

void describe('System', () => {
  const scenarios = scenarioGroups.cases as SystemScenarioInterface[];
  scenarios.forEach((scenario) => {
    void it(scenario.name, () => {
      SystemScenarioDispatcher.run(scenario);
    });
  });
});
