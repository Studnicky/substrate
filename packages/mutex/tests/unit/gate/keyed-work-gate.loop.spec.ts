import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { CoalesceOptionsEntity } from '@studnicky/concurrency/entities';
import { Coalesce } from '@studnicky/concurrency/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import { MutexKeyStateEntity } from '../../../src/entities/MutexKeyStateEntity.js';
import { KeyedWorkGate } from '../../../src/gate/index.js';
import { Mutex } from '../../../src/mutex/Mutex.js';
import { KeyedWorkGateScenarioCaseEntity } from './entities/KeyedWorkGateScenarioCaseEntity.js';
import scenarioGroups from './keyed-work-gate.scenarios.json' with { 'type': 'json' };

class KeyedWorkGateRunners {
  static async 'composed-instances'(scenarioCase: ScenarioCaseOfType<KeyedWorkGateScenarioCaseEntity.Type, 'composed-instances'>): Promise<void> {
    const config = ScenarioValues.requireDefined(scenarioCase.input.config, 'input.config');
    const key = ScenarioValues.requireDefined(scenarioCase.input.key, 'input.key');
    const coalesce = Coalesce.create<unknown>(config.coalesce);
    const mutex = Mutex.create<string>(config.mutex);
    const gate = KeyedWorkGate.create<string>({ 'coalesce': coalesce, 'mutex': mutex });
    const result = await gate.runSerialized(key, () => {
      const settled = Promise.resolve(scenarioCase.expected.result);
      return settled;
    });
    assert.equal(result, scenarioCase.expected.result);
    assert.equal(mutex.isLocked(key), scenarioCase.expected.mutexIsLocked);
    assert.equal(coalesce.isInflight(key), scenarioCase.expected.coalesceIsInflight);
  }

  static async 'default-serialize-same-key'(scenarioCase: ScenarioCaseOfType<KeyedWorkGateScenarioCaseEntity.Type, 'default-serialize-same-key'>): Promise<void> {
    const key = ScenarioValues.requireDefined(scenarioCase.input.key, 'input.key');
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];
    const results = await Promise.all([
      gate.runSerialized(key, () => {
        order.push('first');
        const settled = Promise.resolve(1);
        return settled;
      }),
      gate.runSerialized(key, () => {
        order.push('second');
        const settled = Promise.resolve(2);
        return settled;
      })
    ]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  }

  static async 'different-keys-do-not-block'(scenarioCase: ScenarioCaseOfType<KeyedWorkGateScenarioCaseEntity.Type, 'different-keys-do-not-block'>): Promise<void> {
    const firstKey = ScenarioValues.requireDefined(scenarioCase.input.key1, 'input.key1');
    const secondKey = ScenarioValues.requireDefined(scenarioCase.input.key2, 'input.key2');
    const firstDelayMs = ScenarioValues.requireDefined(scenarioCase.input.key1DelayMs, 'input.key1DelayMs');
    const secondDelayMs = ScenarioValues.requireDefined(scenarioCase.input.key2DelayMs, 'input.key2DelayMs');
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];
    await Promise.all([
      gate.runSerialized(firstKey, async () => {
        order.push('user1-start');
        await setTimeout(firstDelayMs);
        order.push('user1-end');
        return 'user1';
      }),
      gate.runSerialized(secondKey, async () => {
        order.push('user2-start');
        await setTimeout(secondDelayMs);
        order.push('user2-end');
        return 'user2';
      })
    ]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
  }

  static async 'plain-config-single-flight'(scenarioCase: ScenarioCaseOfType<KeyedWorkGateScenarioCaseEntity.Type, 'plain-config-single-flight'>): Promise<void> {
    const config = ScenarioValues.requireDefined(scenarioCase.input.config, 'input.config');
    const key = ScenarioValues.requireDefined(scenarioCase.input.key, 'input.key');
    const gate = KeyedWorkGate.create<string>({ 'coalesce': config.coalesce, 'mutex': config.mutex });
    let runs = 0;
    const values = await Promise.all([
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
        runs += 1;
        await Promise.resolve();
        const created = CoalesceOptionsEntity.create({ 'timeout': runs });
        return created;
      }),
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
        runs += 1;
        await Promise.resolve();
        const created = CoalesceOptionsEntity.create({ 'timeout': runs });
        return created;
      })
    ]);
    const timeouts: unknown[] = [];
    for (let index = 0; index < values.length; index += 1) {
      const value = ScenarioValues.requireDefined(values[index], 'values[index]');
      timeouts.push(value.timeout);
    }
    assert.deepStrictEqual(timeouts, scenarioCase.expected.result);
    assert.equal(runs, scenarioCase.expected.runs);
  }

  static async 'same-key-serialized-exclusion'(scenarioCase: ScenarioCaseOfType<KeyedWorkGateScenarioCaseEntity.Type, 'same-key-serialized-exclusion'>): Promise<void> {
    const key = ScenarioValues.requireDefined(scenarioCase.input.key, 'input.key');
    const delayMs = ScenarioValues.requireDefined(scenarioCase.input.delayMs, 'input.delayMs');
    const gate = KeyedWorkGate.create<string>();
    let active = 0;
    let maximumActive = 0;
    let calls = 0;
    const completionOrder: number[] = [];
    const work = async (index: number): Promise<number> => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      calls += 1;
      await setTimeout(delayMs);
      active -= 1;
      completionOrder.push(index);
      return index;
    };
    const results = await Promise.all([
      gate.runSerialized(key, () => {
        const pending = work(0);
        return pending;
      }),
      gate.runSerialized(key, () => {
        const pending = work(1);
        return pending;
      }),
      gate.runSerialized(key, () => {
        const pending = work(2);
        return pending;
      })
    ]);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.equal(maximumActive, scenarioCase.expected.maximumActive);
    assert.deepStrictEqual(completionOrder, scenarioCase.expected.completionOrder);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  }

  static async 'single-flight-holds-mutex-against-serialized'(scenarioCase: ScenarioCaseOfType<KeyedWorkGateScenarioCaseEntity.Type, 'single-flight-holds-mutex-against-serialized'>): Promise<void> {
    const key = ScenarioValues.requireDefined(scenarioCase.input.key, 'input.key');
    const leaderDelayMs = ScenarioValues.requireDefined(scenarioCase.input.leaderDelayMs, 'input.leaderDelayMs');
    const serializedDelayMs = ScenarioValues.requireDefined(scenarioCase.input.serializedDelayMs, 'input.serializedDelayMs');
    const waitBeforeSerializedMs = ScenarioValues.requireDefined(scenarioCase.input.waitBeforeSerializedMs, 'input.waitBeforeSerializedMs');
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];
    const leader = gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
      order.push('single-flight-start');
      await setTimeout(leaderDelayMs);
      order.push('single-flight-end');
      const created = CoalesceOptionsEntity.create({ 'timeout': 1 });
      return created;
    });
    await setTimeout(waitBeforeSerializedMs);
    const serialized = gate.runSerialized(key, async () => {
      order.push('serialized-start');
      await setTimeout(serializedDelayMs);
      order.push('serialized-end');
      return 'serialized';
    });
    await Promise.all([leader, serialized]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
  }

  static async 'single-flight-parses-result'(scenarioCase: ScenarioCaseOfType<KeyedWorkGateScenarioCaseEntity.Type, 'single-flight-parses-result'>): Promise<void> {
    const key = ScenarioValues.requireDefined(scenarioCase.input.key, 'input.key');
    const delayMs = ScenarioValues.requireDefined(scenarioCase.input.delayMs, 'input.delayMs');
    const resolved = ScenarioValues.requireDefined(scenarioCase.expected.resolved, 'expected.resolved');
    const rejectedName = ScenarioValues.requireDefined(scenarioCase.expected.rejectedName, 'expected.rejectedName');
    const gate = KeyedWorkGate.create<string>();
    const validResult = gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
      await setTimeout(delayMs);
      const created = CoalesceOptionsEntity.create({ 'timeout': resolved });
      return created;
    });
    const invalidResult = gate.runSingleFlight(key, MutexKeyStateEntity, () => {
      const settled = Promise.resolve('locked');
      return settled;
    });
    assert.equal((await validResult).timeout, resolved);
    await assert.rejects(invalidResult, { 'name': rejectedName });
  }

  static async 'single-flight-reruns-after-settle'(scenarioCase: ScenarioCaseOfType<KeyedWorkGateScenarioCaseEntity.Type, 'single-flight-reruns-after-settle'>): Promise<void> {
    const key = ScenarioValues.requireDefined(scenarioCase.input.key, 'input.key');
    const gate = KeyedWorkGate.create<string>();
    let calls = 0;
    const work = async (): Promise<number> => {
      calls += 1;
      await Promise.resolve();
      return calls;
    };
    const first = await gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
      const created = CoalesceOptionsEntity.create({ 'timeout': await work() });
      return created;
    });
    const second = await gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
      const created = CoalesceOptionsEntity.create({ 'timeout': await work() });
      return created;
    });
    assert.equal(calls, scenarioCase.expected.calls);
    assert.equal(first.timeout, scenarioCase.expected.first);
    assert.equal(second.timeout, scenarioCase.expected.second);
  }

  static async 'single-flight-shares-result'(scenarioCase: ScenarioCaseOfType<KeyedWorkGateScenarioCaseEntity.Type, 'single-flight-shares-result'>): Promise<void> {
    const key = ScenarioValues.requireDefined(scenarioCase.input.key, 'input.key');
    const delayMs = ScenarioValues.requireDefined(scenarioCase.input.delayMs, 'input.delayMs');
    const gate = KeyedWorkGate.create<string>();
    let calls = 0;
    const work = async (): Promise<number> => {
      calls += 1;
      await setTimeout(delayMs);
      return 100;
    };
    const [first, second, third] = await Promise.all([
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
        const created = CoalesceOptionsEntity.create({ 'timeout': await work() });
        return created;
      }),
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
        const created = CoalesceOptionsEntity.create({ 'timeout': await work() });
        return created;
      }),
      gate.runSingleFlight(key, CoalesceOptionsEntity, async () => {
        const created = CoalesceOptionsEntity.create({ 'timeout': await work() });
        return created;
      })
    ]);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.deepStrictEqual([first.timeout, second.timeout, third.timeout], scenarioCase.expected.values);
  }
}

ScenarioSuite.register({
  'entity': KeyedWorkGateScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'KeyedWorkGate',
  'runners': KeyedWorkGateRunners
});
