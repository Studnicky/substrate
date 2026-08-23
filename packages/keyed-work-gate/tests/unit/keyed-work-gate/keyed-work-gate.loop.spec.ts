import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Coalesce } from '@studnicky/concurrency';
import { Mutex } from '@studnicky/mutex';

import { KeyedWorkGate } from '../../../src/index.js';
import type { KeyedWorkGateConfigInterface } from '../../../src/interfaces/index.js';

type SerializableGateConfigInput = {
  coalesce: { timeout: number };
  mutex: { timeout: number };
};

type ConfiguredGateInput = {
  config: SerializableGateConfigInput;
  key: string;
};

type MaterializedGateDelegates<K extends PropertyKey> = {
  coalesce: Coalesce<unknown>;
  mutex: Mutex<K>;
};

type ScenarioCase =
  | {
      description: string;
      expected: { result: [number, number]; runs: 1 };
      input: ConfiguredGateInput;
      shape: 'plain-config-single-flight';
      name: string;
    }
  | {
      description: string;
      expected: { coalesceIsInflight: false; mutexIsLocked: false; result: string };
      input: ConfiguredGateInput;
      shape: 'composed-instances';
      name: string;
    }
  | {
      description: string;
      expected: { order: ['first', 'second']; results: [number, number] };
      input: { key: string };
      shape: 'default-serialize-same-key';
      name: string;
    }
  | {
      description: string;
      expected: { calls: 3; completionOrder: [number, number, number]; maxActive: 1; results: [number, number, number] };
      input: { delayMs: number; key: string };
      shape: 'same-key-serialized-exclusion';
      name: string;
    }
  | {
      description: string;
      expected: { order: ['user1-start', 'user2-start', 'user2-end', 'user1-end'] };
      input: { key1: string; key2: string; key1DelayMs: number; key2DelayMs: number };
      shape: 'different-keys-do-not-block';
      name: string;
    }
  | {
      description: string;
      expected: { calls: 1; values: ['shared-result', 'shared-result', 'shared-result'] };
      input: { key: string; delayMs: number };
      shape: 'single-flight-shares-result';
      name: string;
    }
  | {
      description: string;
      expected: { calls: 2; first: 1; second: 2 };
      input: { key: string };
      shape: 'single-flight-reruns-after-settle';
      name: string;
    }
  | {
      description: string;
      expected: { resolved: 'shared-result'; rejectedName: 'TypeError' };
      input: { key: string; delayMs: number };
      shape: 'single-flight-validates-result';
      name: string;
    }
  | {
      description: string;
      expected: { order: ['single-flight-start', 'single-flight-end', 'serialized-start', 'serialized-end'] };
      input: { key: string; leaderDelayMs: number; serializedDelayMs: number; waitBeforeSerializedMs: number };
      shape: 'single-flight-holds-mutex-against-serialized';
      name: string;
    };

import scenarioGroups from './keyed-work-gate.scenarios.json' with { type: 'json' };

const acceptsNumber = (value: unknown): value is number => typeof value === 'number';
const acceptsString = (value: unknown): value is string => typeof value === 'string';

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

type ScenarioRunner<K extends ScenarioCase['shape']> =
  (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

const runnerMap: RunnerMap = {
  'composed-instances': async (scenarioCase) => {
    const { coalesce, mutex } = materializeDelegateInstances<string>(scenarioCase.input.config);
    const gate = KeyedWorkGate.create<string>({ coalesce, mutex });
    assert.equal(await gate.runSerialized(scenarioCase.input.key, async () => scenarioCase.expected.result, acceptsString), scenarioCase.expected.result);
    assert.equal(mutex.isLocked(scenarioCase.input.key), scenarioCase.expected.mutexIsLocked);
    assert.equal(coalesce.isInflight(scenarioCase.input.key), scenarioCase.expected.coalesceIsInflight);
  },
  'default-serialize-same-key': async (scenarioCase) => {
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];
    const results = await Promise.all([
      gate.runSerialized(scenarioCase.input.key, async () => { order.push('first'); return 1; }, acceptsNumber),
      gate.runSerialized(scenarioCase.input.key, async () => { order.push('second'); return 2; }, acceptsNumber)
    ]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },
  'different-keys-do-not-block': async (scenarioCase) => {
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];
    await Promise.all([
      gate.runSerialized(scenarioCase.input.key1, async () => {
        order.push('user1-start');
        await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.key1DelayMs); });
        order.push('user1-end');
        return 'user1';
      }, acceptsString),
      gate.runSerialized(scenarioCase.input.key2, async () => {
        order.push('user2-start');
        await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.key2DelayMs); });
        order.push('user2-end');
        return 'user2';
      }, acceptsString)
    ]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
  },
  'plain-config-single-flight': async (scenarioCase) => {
    const gate = KeyedWorkGate.create<string>(materializeSerializableConfig<string>(scenarioCase.input.config));
    let runs = 0;
    const values = await Promise.all([
      gate.runSingleFlight(scenarioCase.input.key, async () => { runs += 1; await Promise.resolve(); return runs; }, acceptsNumber),
      gate.runSingleFlight(scenarioCase.input.key, async () => { runs += 1; await Promise.resolve(); return runs; }, acceptsNumber)
    ]);
    assert.deepStrictEqual(values, scenarioCase.expected.result);
    assert.equal(runs, scenarioCase.expected.runs);
  },
  'same-key-serialized-exclusion': async (scenarioCase) => {
    const gate = KeyedWorkGate.create<string>();
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    const completionOrder: number[] = [];
    const fn = async (index: number): Promise<number> => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls += 1;
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.delayMs); });
      active -= 1;
      completionOrder.push(index);
      return index;
    };
    const results = await Promise.all([
      gate.runSerialized(scenarioCase.input.key, () => fn(0), acceptsNumber),
      gate.runSerialized(scenarioCase.input.key, () => fn(1), acceptsNumber),
      gate.runSerialized(scenarioCase.input.key, () => fn(2), acceptsNumber)
    ]);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.equal(maxActive, scenarioCase.expected.maxActive);
    assert.deepStrictEqual(completionOrder, scenarioCase.expected.completionOrder);
    assert.deepStrictEqual(results, scenarioCase.expected.results);
  },
  'single-flight-shares-result': async (scenarioCase) => {
    const gate = KeyedWorkGate.create<string>();
    let calls = 0;
    const fn = async (): Promise<string> => {
      calls += 1;
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.delayMs); });
      return 'shared-result';
    };
    const [a, b, c] = await Promise.all([
      gate.runSingleFlight(scenarioCase.input.key, fn, acceptsString),
      gate.runSingleFlight(scenarioCase.input.key, fn, acceptsString),
      gate.runSingleFlight(scenarioCase.input.key, fn, acceptsString)
    ]);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.deepStrictEqual([a, b, c], scenarioCase.expected.values);
  },
  'single-flight-holds-mutex-against-serialized': async (scenarioCase) => {
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];
    const leader = gate.runSingleFlight(scenarioCase.input.key, async () => {
      order.push('single-flight-start');
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.leaderDelayMs); });
      order.push('single-flight-end');
      return 'leader';
    }, acceptsString);
    await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.waitBeforeSerializedMs); });
    const serialized = gate.runSerialized(scenarioCase.input.key, async () => {
      order.push('serialized-start');
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.serializedDelayMs); });
      order.push('serialized-end');
      return 'serialized';
    }, acceptsString);
    await Promise.all([leader, serialized]);
    assert.deepStrictEqual(order, scenarioCase.expected.order);
  },
  'single-flight-reruns-after-settle': async (scenarioCase) => {
    const gate = KeyedWorkGate.create<string>();
    let calls = 0;
    const fn = async (): Promise<number> => {
      calls += 1;
      await Promise.resolve();
      return calls;
    };
    const first = await gate.runSingleFlight(scenarioCase.input.key, fn, acceptsNumber);
    const second = await gate.runSingleFlight(scenarioCase.input.key, fn, acceptsNumber);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.equal(first, scenarioCase.expected.first);
    assert.equal(second, scenarioCase.expected.second);
  },
  'single-flight-validates-result': async (scenarioCase) => {
    const gate = KeyedWorkGate.create<string>();
    const stringResult = gate.runSingleFlight(scenarioCase.input.key, async () => {
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.delayMs); });
      return 'shared-result';
    }, acceptsString);
    const numberResult = gate.runSingleFlight(scenarioCase.input.key, async () => 42, acceptsNumber);
    assert.equal(await stringResult, scenarioCase.expected.resolved);
    await assert.rejects(numberResult, (error: unknown): boolean => error instanceof TypeError && error.name === scenarioCase.expected.rejectedName);
  }
};

function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('KeyedWorkGate', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
