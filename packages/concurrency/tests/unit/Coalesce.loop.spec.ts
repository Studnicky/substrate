import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';
import { Coalesce } from '../../src/Coalesce.js';
import { CoalesceTimeoutError } from '../../src/errors/CoalesceTimeoutError.js';
import scenarioGroups from './Coalesce.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'shared-factory'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'independent-keys'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'inflight-state'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'factory-error-cleanup'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'factory-throw'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'sequential-calls'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'coalesce-start-hooks'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'start-gate'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'settled-success'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'settled-failure'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'join-hook-rejects'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'no-timeout'; name: string }
  | { description: string; expected: Record<string, unknown>; input: { coalesce: { timeout: number }; key: string; result: string }; shape: 'timeout-rejects'; name: string }
  | { description: string; expected: Record<string, unknown>; input: { coalesce: { timeout: number }; key: string; result: string }; shape: 'timeout-second-caller'; name: string }
  | { description: string; expected: Record<string, unknown>; input: { coalesce: { timeout: number }; key: string }; shape: 'async-timeout-hook'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'rejecting-start-hook'; name: string }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; shape: 'throwing-settled-hook'; name: string };

class ObservedCoalesce<T> extends Coalesce<T> {
  readonly startEvents: string[] = [];
  readonly joinEvents: string[] = [];
  readonly settledEvents: { 'key': string; 'success': boolean }[] = [];
  protected override onCoalesceStart(key: string): void { this.startEvents.push(key); }
  protected override onCoalesceJoin(key: string): void { this.joinEvents.push(key); }
  protected override onCoalesceSettled(key: string, success: boolean): void { this.settledEvents.push({ 'key': key, 'success': success }); }
}

class ObservedTimeoutCoalesce<T> extends Coalesce<T> {
  readonly timeoutEvents: { 'key': string; 'timeoutMs': number }[] = [];
  protected override onTimeout(key: string, timeoutMs: number): void {
    this.timeoutEvents.push({ 'key': key, 'timeoutMs': timeoutMs });
  }
}

const scenarioRunners: Record<ScenarioCase['shape'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'shared-factory': async (scenarioCase) => {
    const input = scenarioCase.input as { calls: number; delayMs: number; key: string; result: string };
    const expected = scenarioCase.expected as { result: string; callCount: number };
    const coalesce = Coalesce.create<string>();
    let calls = 0;
    const factory = (): Promise<string> => {
      calls += 1;
      return new Promise((resolve) => setTimeout(() => resolve(input.result), input.delayMs));
    };
    const [a, b, c] = await Promise.all([coalesce.run(input.key, factory), coalesce.run(input.key, factory), coalesce.run(input.key, factory)]);
    assert.equal(calls, expected.callCount);
    assert.equal(a, expected.result);
    assert.equal(b, expected.result);
    assert.equal(c, expected.result);
  },

  'independent-keys': async (scenarioCase) => {
    const input = scenarioCase.input as { keyA: string; keyB: string; valueA: number; valueB: number };
    const expected = scenarioCase.expected as { callCount: number; resultA: number; resultB: number };
    const coalesce = Coalesce.create<number>();
    let calls = 0;
    const factory = (n: number) => (): Promise<number> => {
      calls += 1;
      return Promise.resolve(n);
    };
    const [a, b] = await Promise.all([coalesce.run(input.keyA, factory(input.valueA)), coalesce.run(input.keyB, factory(input.valueB))]);
    assert.equal(calls, expected.callCount);
    assert.equal(a, expected.resultA);
    assert.equal(b, expected.resultB);
  },

  'inflight-state': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string; result: string };
    const expected = scenarioCase.expected as { inflightBefore: boolean; inflightAfter: boolean };
    const coalesce = Coalesce.create<string>();
    const deferred = Promise.withResolvers<string>();
    const pending = coalesce.run(input.key, () => deferred.promise);
    assert.equal(coalesce.isInflight(input.key), expected.inflightBefore);
    deferred.resolve(input.result);
    await pending;
    assert.equal(coalesce.isInflight(input.key), expected.inflightAfter);
  },

  'factory-error-cleanup': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string; message: string };
    const expected = scenarioCase.expected as { inflightAfter: boolean };
    const coalesce = Coalesce.create<string>();
    await assert.rejects(() => coalesce.run(input.key, () => Promise.reject(new Error(input.message))), new RegExp(input.message));
    assert.equal(coalesce.isInflight(input.key), expected.inflightAfter);
  },

  'factory-throw': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string; message: string };
    const expected = scenarioCase.expected as { inflightAfter: boolean };
    const coalesce = Coalesce.create<string>();
    await assert.rejects(() => coalesce.run(input.key, () => { throw new Error(input.message); }), new RegExp(input.message));
    assert.equal(coalesce.isInflight(input.key), expected.inflightAfter);
  },

  'sequential-calls': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string; result1: number; result2: number };
    const expected = scenarioCase.expected as { callCount: number };
    const coalesce = Coalesce.create<number>();
    let calls = 0;
    const factory = (): Promise<number> => Promise.resolve(++calls);
    await coalesce.run(input.key, factory);
    await coalesce.run(input.key, factory);
    assert.equal(calls, expected.callCount);
  },

  'join-hook-rejects': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string; message: string };
    const expected = scenarioCase.expected as { settledEvents: boolean[] };
    class RejectingJoinCoalesce<T> extends Coalesce<T> {
      readonly settledEvents: boolean[] = [];
      protected override onCoalesceJoin(): void {
        throw new Error(input.message);
      }
      protected override onCoalesceSettled(_key: string, success: boolean): void {
        this.settledEvents.push(success);
      }
    }
    const c = RejectingJoinCoalesce.create();
    const deferred = Promise.withResolvers<string>();
    const leader = c.run(input.key, () => deferred.promise);
    const joiner = c.run(input.key, async () => 'unused');
    await assert.rejects(joiner, HookInvocationError);
    deferred.resolve('shared');
    await leader;
    assert.deepEqual(c.settledEvents, expected.settledEvents);
  },

  'coalesce-start-hooks': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string };
    const expected = scenarioCase.expected as { joinCount: number; startCount: number };
    const c = ObservedCoalesce.create();
    const factory = (): Promise<string> => new Promise((resolve) => setTimeout(() => resolve('v'), 10));
    await Promise.all([c.run(input.key, factory), c.run(input.key, factory), c.run(input.key, factory)]);
    assert.equal(c.startEvents.length, expected.startCount);
    assert.equal(c.joinEvents.length, expected.joinCount);
    assert.deepEqual(c.startEvents, [input.key]);
    assert.deepEqual(c.joinEvents, [input.key, input.key]);
  },

  'start-gate': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string };
    const expected = scenarioCase.expected as { factoryCalls: number; inflight: boolean };
    const startGate = Promise.withResolvers<void>();
    let factoryCalls = 0;
    class PendingStartCoalesce<T> extends Coalesce<T> {
      protected override onCoalesceStart(): Promise<void> {
        return startGate.promise;
      }
    }
    const c = PendingStartCoalesce.create<string>();
    const factory = async (): Promise<string> => {
      factoryCalls += 1;
      return 'shared';
    };
    const leader = c.run(input.key, factory);
    const joiner = c.run(input.key, factory);
    assert.equal(c.isInflight(input.key), expected.inflight);
    assert.equal(factoryCalls, 0);
    startGate.resolve();
    assert.deepEqual(await Promise.all([leader, joiner]), ['shared', 'shared']);
    assert.equal(factoryCalls, expected.factoryCalls);
    assert.equal(c.isInflight(input.key), false);
  },

  'settled-success': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string; result: number };
    const expected = scenarioCase.expected as { success: boolean };
    const c = ObservedCoalesce.create();
    await c.run(input.key, () => Promise.resolve(input.result));
    assert.equal(c.settledEvents.length, 1);
    assert.deepEqual(c.settledEvents[0], { 'key': input.key, 'success': expected.success });
  },

  'settled-failure': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string; message: string };
    const expected = scenarioCase.expected as { success: boolean };
    const c = ObservedCoalesce.create();
    await assert.rejects(() => c.run(input.key, () => Promise.reject(new Error(input.message))), new RegExp(input.message));
    assert.equal(c.settledEvents.length, 1);
    assert.deepEqual(c.settledEvents[0], { 'key': input.key, 'success': expected.success });
  },

  'no-timeout': async (scenarioCase) => {
    const input = scenarioCase.input as { delayMs: number; key: string; result: string };
    const expected = scenarioCase.expected as { result: string };
    const c = Coalesce.create<string>();
    const factory = (): Promise<string> => new Promise((resolve) => { setTimeout(() => resolve(input.result), input.delayMs); });
    const result = await c.run(input.key, factory);
    assert.equal(result, expected.result);
  },

  'timeout-rejects': async (scenarioCase) => {
    const input = scenarioCase.input as { coalesce: { timeout: number }; key: string; result: string };
    const expected = scenarioCase.expected as { inflightAfterTimeout: boolean; timeoutEvents: { key: string; timeoutMs: number }[] };
    const c = ObservedTimeoutCoalesce.create({ 'timeout': input.coalesce.timeout });
    const deferred = Promise.withResolvers<string>();
    const pending = c.run(input.key, () => deferred.promise);
    await assert.rejects(pending, {
      'key': input.key,
      'name': CoalesceTimeoutError.name,
      'timeoutMs': input.coalesce.timeout
    });
    assert.deepEqual(c.timeoutEvents, expected.timeoutEvents);
    assert.equal(c.isInflight(input.key), expected.inflightAfterTimeout);
    deferred.resolve(input.result);
    await new Promise((resolve) => { setTimeout(resolve, 5); });
    assert.equal(c.isInflight(input.key), false);
  },

  'timeout-second-caller': async (scenarioCase) => {
    const input = scenarioCase.input as { coalesce: { timeout: number }; key: string; result: string };
    const expected = scenarioCase.expected as { timeoutEvents: number };
    const c = ObservedTimeoutCoalesce.create({ 'timeout': input.coalesce.timeout });
    const deferred = Promise.withResolvers<string>();
    const firstCaller = c.run(input.key, () => deferred.promise);
    await assert.rejects(firstCaller, CoalesceTimeoutError);
    assert.equal(c.isInflight(input.key), true);
    const secondCaller = c.run(input.key, () => deferred.promise);
    deferred.resolve(input.result);
    const secondResult = await secondCaller;
    assert.equal(secondResult, input.result);
    assert.equal(c.timeoutEvents.length, expected.timeoutEvents);
  },

  'async-timeout-hook': async (scenarioCase) => {
    const input = scenarioCase.input as { coalesce: { timeout: number }; key: string };
    const expected = scenarioCase.expected as { hookName: string; unhandledRejections: number };
    class RejectingTimeoutCoalesce<T> extends Coalesce<T> {
      protected override async onTimeout(): Promise<void> {
        await new Promise((resolve) => { setImmediate(resolve); });
        throw new Error('timeout hook boom');
      }
    }
    let rejectionCount = 0;
    const onUnhandledRejection = (): void => { rejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const c = RejectingTimeoutCoalesce.create<string>({ 'timeout': input.coalesce.timeout });
      const deferred = Promise.withResolvers<string>();
      const pending = c.run(input.key, () => deferred.promise);
      await assert.rejects(pending, { 'hookName': expected.hookName, 'name': HookInvocationError.name });
      assert.equal(c.isInflight(input.key), true);
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionCount, expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },

  'rejecting-start-hook': async (scenarioCase) => {
    const input = scenarioCase.input as { key: string; message: string };
    const expected = scenarioCase.expected as { settledEvents: boolean[]; inflightAfter: boolean };
    const startGate = Promise.withResolvers<void>();
    class RejectingStartCoalesce<T> extends Coalesce<T> {
      readonly settledEvents: boolean[] = [];
      protected override onCoalesceStart(): Promise<void> {
        return startGate.promise;
      }
      protected override onCoalesceSettled(_key: string, success: boolean): void {
        this.settledEvents.push(success);
      }
    }
    const c = RejectingStartCoalesce.create();
    let calls = 0;
    const factory = async (): Promise<string> => { calls += 1; return 'ok'; };
    const leader = c.run(input.key, factory);
    const joiner = c.run(input.key, factory);
    assert.equal(c.isInflight(input.key), true);
    assert.equal(calls, 0);
    startGate.reject(new Error(input.message));
    await Promise.all([assert.rejects(leader, HookInvocationError), assert.rejects(joiner, HookInvocationError)]);
    assert.equal(calls, 0);
    assert.equal(c.isInflight(input.key), expected.inflightAfter);
    assert.deepEqual(c.settledEvents, expected.settledEvents);
  },

  'throwing-settled-hook': async (scenarioCase) => {
    const input = scenarioCase.input as { factoryMessage: string; firstKey: string; secondKey: string; settledMessage: string };
    const expected = scenarioCase.expected as { inflightAfter: boolean };
    class ThrowingSettledCoalesce<T> extends Coalesce<T> {
      protected override onCoalesceSettled(): void {
        throw new Error(input.settledMessage);
      }
    }
    const resolved = ThrowingSettledCoalesce.create<string>();
    await assert.rejects(() => resolved.run(input.firstKey, async () => 'value'), HookInvocationError);
    assert.equal(resolved.isInflight(input.firstKey), expected.inflightAfter);
    const rejected = ThrowingSettledCoalesce.create<string>();
    await assert.rejects(() => rejected.run(input.secondKey, async () => { throw new Error(input.factoryMessage); }), HookInvocationError);
    assert.equal(rejected.isInflight(input.secondKey), expected.inflightAfter);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await scenarioRunners[scenarioCase.shape](scenarioCase);
}

void describe('Coalesce', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
