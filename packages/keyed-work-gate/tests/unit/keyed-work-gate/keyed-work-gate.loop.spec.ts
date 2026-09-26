import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Coalesce } from '@studnicky/concurrency/node';
import { CoalesceOptionsEntity } from '@studnicky/concurrency/entities';
import { RuntimeError } from '@studnicky/errors/node';
import { Mutex } from '@studnicky/mutex/node';
import { MutexKeyStateEntity } from '@studnicky/mutex/entities';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';

import { KeyedWorkGate } from '../../../src/index.js';
import type { KeyedWorkGateConfigInterface } from '../../../src/interfaces/index.js';
import { KeyedWorkGateScenarioCaseEntity } from '../entities/KeyedWorkGateScenarioCaseEntity.js';
import scenarioGroups from './keyed-work-gate.scenarios.json' with { type: 'json' };

type SerializableGateConfigInput = {
  coalesce: { timeout: number };
  mutex: { timeout: number };
};

type MaterializedGateDelegates<K extends PropertyKey> = {
  coalesce: Coalesce<unknown>;
  mutex: Mutex<K>;
};

type ScenarioCase = KeyedWorkGateScenarioCaseEntity.Type;

const fileIntake = ScenarioFileCompiler.compileIntake(KeyedWorkGateScenarioCaseEntity.Schema, KeyedWorkGateScenarioCaseEntity.Node);

/** Fails loudly when a scenario case's shape-specific field is absent from the fixture. */
function requireDefined<T>(value: T | undefined, fieldPath: string): T {
  if (value !== undefined) {
    return value;
  }
  throw RuntimeError.create(`Missing keyed-work-gate scenario field: ${fieldPath}`);
}

const materializeDelegateInstances = <K extends PropertyKey>(
  config: SerializableGateConfigInput
): MaterializedGateDelegates<K> => ({
  coalesce: Coalesce.create<unknown>(config.coalesce),
  mutex: Mutex.create<K>(config.mutex)
});

const materializeSerializableConfig = <K extends PropertyKey>(
  config: SerializableGateConfigInput
): KeyedWorkGateConfigInterface<K> => ({
  coalesce: config.coalesce,
  mutex: config.mutex
});

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void>;
type RunnerMap = Record<ScenarioCase['shape'], ScenarioRunner>;

const runnerMap: RunnerMap = {
  'composed-instances': async (scenarioCase) => {
    const config = requireDefined(scenarioCase.input.config, 'input.config');
    const key = requireDefined(scenarioCase.input.key, 'input.key');
    const { coalesce, mutex } = materializeDelegateInstances<string>(config);
    const gate = KeyedWorkGate.create<string>({ coalesce, mutex });
    assert.equal(await gate.runSerialized(key, async () => scenarioCase.expected.result), scenarioCase.expected.result);
    assert.equal(mutex.isLocked(key), scenarioCase.expected.mutexIsLocked);
    assert.equal(coalesce.isInflight(key), scenarioCase.expected.coalesceIsInflight);
  },
  'default-serialize-same-key': async (scenarioCase) => {
    const key = requireDefined(scenarioCase.input.key, 'input.key');
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];
    const results = await Promise.all([
      gate.runSerialized(key, async () => { order.push('first'); return 1; }),
      gate.runSerialized(key, async () => { order.push('second'); return 2; })
    ]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },
  'different-keys-do-not-block': async (scenarioCase) => {
    const key1 = requireDefined(scenarioCase.input.key1, 'input.key1');
    const key2 = requireDefined(scenarioCase.input.key2, 'input.key2');
    const key1DelayMs = requireDefined(scenarioCase.input.key1DelayMs, 'input.key1DelayMs');
    const key2DelayMs = requireDefined(scenarioCase.input.key2DelayMs, 'input.key2DelayMs');
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];
    await Promise.all([
      gate.runSerialized(key1, async () => {
        order.push('user1-start');
        await new Promise((resolve) => { setTimeout(resolve, key1DelayMs); });
        order.push('user1-end');
        return 'user1';
      }),
      gate.runSerialized(key2, async () => {
        order.push('user2-start');
        await new Promise((resolve) => { setTimeout(resolve, key2DelayMs); });
        order.push('user2-end');
        return 'user2';
      })
    ]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
  },
  'plain-config-single-flight': async (scenarioCase) => {
    const config = requireDefined(scenarioCase.input.config, 'input.config');
    const key = requireDefined(scenarioCase.input.key, 'input.key');
    const gate = KeyedWorkGate.create<string>(materializeSerializableConfig<string>(config));
    let runs = 0;
    const values = await Promise.all([
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => { runs += 1; await Promise.resolve(); return CoalesceOptionsEntity.create({ 'timeout': runs }); }),
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => { runs += 1; await Promise.resolve(); return CoalesceOptionsEntity.create({ 'timeout': runs }); })
    ]);
    assert.deepStrictEqual(values.map((value) => value.timeout), scenarioCase.expected.result);
    assert.equal(runs, scenarioCase.expected.runs);
  },
  'same-key-serialized-exclusion': async (scenarioCase) => {
    const key = requireDefined(scenarioCase.input.key, 'input.key');
    const delayMs = requireDefined(scenarioCase.input.delayMs, 'input.delayMs');
    const gate = KeyedWorkGate.create<string>();
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    const completionOrder: number[] = [];
    const fn = async (index: number): Promise<number> => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls += 1;
      await new Promise((resolve) => { setTimeout(resolve, delayMs); });
      active -= 1;
      completionOrder.push(index);
      return index;
    };
    const results = await Promise.all([
      gate.runSerialized(key, () => fn(0)),
      gate.runSerialized(key, () => fn(1)),
      gate.runSerialized(key, () => fn(2))
    ]);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.equal(maxActive, scenarioCase.expected.maxActive);
    assert.deepStrictEqual(completionOrder, scenarioCase.expected.completionOrder);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },
  'single-flight-shares-result': async (scenarioCase) => {
    const key = requireDefined(scenarioCase.input.key, 'input.key');
    const delayMs = requireDefined(scenarioCase.input.delayMs, 'input.delayMs');
    const gate = KeyedWorkGate.create<string>();
    let calls = 0;
    const fn = async (): Promise<number> => {
      calls += 1;
      await new Promise((resolve) => { setTimeout(resolve, delayMs); });
      return 100;
    };
    const [a, b, c] = await Promise.all([
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => CoalesceOptionsEntity.create({ 'timeout': await fn() })),
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => CoalesceOptionsEntity.create({ 'timeout': await fn() })),
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => CoalesceOptionsEntity.create({ 'timeout': await fn() }))
    ]);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.deepStrictEqual([a.timeout, b.timeout, c.timeout], scenarioCase.expected.values);
  },
  'single-flight-holds-mutex-against-serialized': async (scenarioCase) => {
    const key = requireDefined(scenarioCase.input.key, 'input.key');
    const leaderDelayMs = requireDefined(scenarioCase.input.leaderDelayMs, 'input.leaderDelayMs');
    const serializedDelayMs = requireDefined(scenarioCase.input.serializedDelayMs, 'input.serializedDelayMs');
    const waitBeforeSerializedMs = requireDefined(scenarioCase.input.waitBeforeSerializedMs, 'input.waitBeforeSerializedMs');
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];
    const leader = gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
      order.push('single-flight-start');
      await new Promise((resolve) => { setTimeout(resolve, leaderDelayMs); });
      order.push('single-flight-end');
      return CoalesceOptionsEntity.create({ 'timeout': 1 });
    });
    await new Promise((resolve) => { setTimeout(resolve, waitBeforeSerializedMs); });
    const serialized = gate.runSerialized(key, async () => {
      order.push('serialized-start');
      await new Promise((resolve) => { setTimeout(resolve, serializedDelayMs); });
      order.push('serialized-end');
      return 'serialized';
    });
    await Promise.all([leader, serialized]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
  },
  'single-flight-reruns-after-settle': async (scenarioCase) => {
    const key = requireDefined(scenarioCase.input.key, 'input.key');
    const gate = KeyedWorkGate.create<string>();
    let calls = 0;
    const fn = async (): Promise<number> => {
      calls += 1;
      await Promise.resolve();
      return calls;
    };
    const first = await gate.runSingleFlight(key, CoalesceOptionsEntity, async () => CoalesceOptionsEntity.create({ 'timeout': await fn() }));
    const second = await gate.runSingleFlight(key, CoalesceOptionsEntity, async () => CoalesceOptionsEntity.create({ 'timeout': await fn() }));
    assert.equal(calls, scenarioCase.expected.calls);
    assert.equal(first.timeout, scenarioCase.expected.first);
    assert.equal(second.timeout, scenarioCase.expected.second);
  },
  'single-flight-parses-result': async (scenarioCase) => {
    const key = requireDefined(scenarioCase.input.key, 'input.key');
    const delayMs = requireDefined(scenarioCase.input.delayMs, 'input.delayMs');
    const resolved = requireDefined(scenarioCase.expected.resolved, 'expected.resolved');
    const rejectedName = requireDefined(scenarioCase.expected.rejectedName, 'expected.rejectedName');
    const gate = KeyedWorkGate.create<string>();
    const validResult = gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
      await new Promise((resolve) => { setTimeout(resolve, delayMs); });
      return CoalesceOptionsEntity.create({ 'timeout': resolved });
    });
    const invalidResult = gate.runSingleFlight(key, MutexKeyStateEntity, async () => 'locked');
    assert.equal((await validResult).timeout, resolved);
    await assert.rejects(invalidResult, { 'name': rejectedName });
  }
};

function runCase(scenarioCase: ScenarioCase): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('KeyedWorkGate', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
