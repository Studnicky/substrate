import { RuntimeError, HookInvocationError } from '@studnicky/errors/node';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Coalesce } from '../../src/Coalesce.js';
import { CoalesceOptionsEntity } from '../../src/entities/CoalesceOptionsEntity.js';
import { CoalesceTimeoutError } from '../../src/errors/CoalesceTimeoutError.js';
import { CoalesceScenarioCaseEntity } from './entities/CoalesceScenarioCaseEntity.js';
import scenarioGroups from './Coalesce.scenarios.json' with { type: 'json' };

function delayedStringFactory(): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve('v'), 10));
}

type ScenarioCase = CoalesceScenarioCaseEntity.Type;
type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = { [K in ScenarioCase['shape']]: ScenarioRunner<K> };

class ObservedCoalesce<T> extends Coalesce<T> {
  readonly startEvents: string[] = [];
  readonly joinEvents: string[] = [];
  readonly settledEvents: { 'key': string; 'success': boolean }[] = [];

  static override create<T>(options?: CoalesceOptionsEntity.InputType): ObservedCoalesce<T> {
    return new ObservedCoalesce<T>(CoalesceOptionsEntity.intake(options ?? {}));
  }
  protected override onCoalesceStart(key: string): void { this.startEvents.push(key); }
  protected override onCoalesceJoin(key: string): void { this.joinEvents.push(key); }
  protected override onCoalesceSettled(key: string, success: boolean): void { this.settledEvents.push({ 'key': key, 'success': success }); }
}

class ObservedTimeoutCoalesce<T> extends Coalesce<T> {
  readonly timeoutEvents: { 'key': string; 'timeoutMs': number }[] = [];

  static override create<T>(options?: CoalesceOptionsEntity.InputType): ObservedTimeoutCoalesce<T> {
    return new ObservedTimeoutCoalesce<T>(CoalesceOptionsEntity.intake(options ?? {}));
  }
  protected override onTimeout(key: string, timeoutMs: number): void {
    this.timeoutEvents.push({ 'key': key, 'timeoutMs': timeoutMs });
  }
}

const scenarioRunners: RunnerMap = {
  'shared-factory': async (scenarioCase) => {
    const coalesce = Coalesce.create<string>();
    let calls = 0;
    const factory = (): Promise<string> => {
      calls += 1;
      return new Promise((resolve) => setTimeout(() => resolve(scenarioCase.input.result), scenarioCase.input.delayMs));
    };
    const [a, b, c] = await Promise.all([coalesce.run(scenarioCase.input.key, factory), coalesce.run(scenarioCase.input.key, factory), coalesce.run(scenarioCase.input.key, factory)]);
    assert.equal(calls, scenarioCase.expected.callCount);
    assert.equal(a, scenarioCase.expected.result);
    assert.equal(b, scenarioCase.expected.result);
    assert.equal(c, scenarioCase.expected.result);
  },

  'independent-keys': async (scenarioCase) => {
    const coalesce = Coalesce.create<number>();
    let calls = 0;
    const factory = (n: number) => (): Promise<number> => {
      calls += 1;
      return Promise.resolve(n);
    };
    const [a, b] = await Promise.all([coalesce.run(scenarioCase.input.keyA, factory(scenarioCase.input.valueA)), coalesce.run(scenarioCase.input.keyB, factory(scenarioCase.input.valueB))]);
    assert.equal(calls, scenarioCase.expected.callCount);
    assert.equal(a, scenarioCase.expected.resultA);
    assert.equal(b, scenarioCase.expected.resultB);
  },

  'inflight-state': async (scenarioCase) => {
    const coalesce = Coalesce.create<string>();
    const deferred = Promise.withResolvers<string>();
    const pending = coalesce.run(scenarioCase.input.key, () => deferred.promise);
    assert.equal(coalesce.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightBefore);
    deferred.resolve(scenarioCase.input.result);
    await pending;
    assert.equal(coalesce.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightAfter);
  },

  'factory-error-cleanup': async (scenarioCase) => {
    const coalesce = Coalesce.create<string>();
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- message is repo-authored fixture data, not attacker input
    await assert.rejects(() => coalesce.run(scenarioCase.input.key, () => Promise.reject(RuntimeError.create(scenarioCase.input.message))), new RegExp(scenarioCase.input.message));
    assert.equal(coalesce.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightAfter);
  },

  'factory-throw': async (scenarioCase) => {
    const coalesce = Coalesce.create<string>();
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- message is repo-authored fixture data, not attacker input
    await assert.rejects(() => coalesce.run(scenarioCase.input.key, () => { throw RuntimeError.create(scenarioCase.input.message); }), new RegExp(scenarioCase.input.message));
    assert.equal(coalesce.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightAfter);
  },

  'sequential-calls': async (scenarioCase) => {
    const coalesce = Coalesce.create<number>();
    let calls = 0;
    const factory = (): Promise<number> => Promise.resolve(++calls);
    await coalesce.run(scenarioCase.input.key, factory);
    await coalesce.run(scenarioCase.input.key, factory);
    assert.equal(calls, scenarioCase.expected.callCount);
  },

  'join-hook-rejects': async (scenarioCase) => {
    class RejectingJoinCoalesce<T> extends Coalesce<T> {
      readonly settledEvents: boolean[] = [];

      static override create<T>(options?: CoalesceOptionsEntity.InputType): RejectingJoinCoalesce<T> {
        return new RejectingJoinCoalesce<T>(CoalesceOptionsEntity.intake(options ?? {}));
      }
      protected override onCoalesceJoin(): void {
        throw RuntimeError.create(scenarioCase.input.message);
      }
      protected override onCoalesceSettled(_key: string, success: boolean): void {
        this.settledEvents.push(success);
      }
    }
    const c = RejectingJoinCoalesce.create();
    const deferred = Promise.withResolvers<string>();
    const leader = c.run(scenarioCase.input.key, () => deferred.promise);
    const joiner = c.run(scenarioCase.input.key, async () => 'unused');
    await assert.rejects(joiner, HookInvocationError);
    deferred.resolve('shared');
    await leader;
    assert.deepEqual(c.settledEvents, scenarioCase.expected.settledEvents);
  },

  'coalesce-start-hooks': async (scenarioCase) => {
    const c = ObservedCoalesce.create();
    await Promise.all([c.run(scenarioCase.input.key, delayedStringFactory), c.run(scenarioCase.input.key, delayedStringFactory), c.run(scenarioCase.input.key, delayedStringFactory)]);
    assert.equal(c.startEvents.length, scenarioCase.expected.startCount);
    assert.equal(c.joinEvents.length, scenarioCase.expected.joinCount);
    assert.deepEqual(c.startEvents, [scenarioCase.input.key]);
    assert.deepEqual(c.joinEvents, [scenarioCase.input.key, scenarioCase.input.key]);
  },

  'start-gate': async (scenarioCase) => {
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
    const leader = c.run(scenarioCase.input.key, factory);
    const joiner = c.run(scenarioCase.input.key, factory);
    assert.equal(c.isInflight(scenarioCase.input.key), scenarioCase.expected.inflight);
    assert.equal(factoryCalls, 0);
    startGate.resolve();
    assert.deepEqual(await Promise.all([leader, joiner]), ['shared', 'shared']);
    assert.equal(factoryCalls, scenarioCase.expected.factoryCalls);
    assert.equal(c.isInflight(scenarioCase.input.key), false);
  },

  'settled-success': async (scenarioCase) => {
    const c = ObservedCoalesce.create();
    await c.run(scenarioCase.input.key, () => Promise.resolve(scenarioCase.input.result));
    assert.equal(c.settledEvents.length, 1);
    assert.deepEqual(c.settledEvents[0], { 'key': scenarioCase.input.key, 'success': scenarioCase.expected.success });
  },

  'settled-failure': async (scenarioCase) => {
    const c = ObservedCoalesce.create();
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp -- message is repo-authored fixture data, not attacker input
    await assert.rejects(() => c.run(scenarioCase.input.key, () => Promise.reject(RuntimeError.create(scenarioCase.input.message))), new RegExp(scenarioCase.input.message));
    assert.equal(c.settledEvents.length, 1);
    assert.deepEqual(c.settledEvents[0], { 'key': scenarioCase.input.key, 'success': scenarioCase.expected.success });
  },

  'no-timeout': async (scenarioCase) => {
    const c = Coalesce.create<string>();
    const factory = (): Promise<string> => new Promise((resolve) => { setTimeout(() => resolve(scenarioCase.input.result), scenarioCase.input.delayMs); });
    const result = await c.run(scenarioCase.input.key, factory);
    assert.equal(result, scenarioCase.expected.result);
  },

  'timeout-rejects': async (scenarioCase) => {
    const c = ObservedTimeoutCoalesce.create({ 'timeout': scenarioCase.input.coalesce.timeout });
    const deferred = Promise.withResolvers<string>();
    const pending = c.run(scenarioCase.input.key, () => deferred.promise);
    await assert.rejects(pending, {
      'key': scenarioCase.input.key,
      'name': CoalesceTimeoutError.name,
      'timeoutMs': scenarioCase.input.coalesce.timeout
    });
    assert.deepEqual(c.timeoutEvents, scenarioCase.expected.timeoutEvents);
    assert.equal(c.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightAfterTimeout);
    deferred.resolve(scenarioCase.input.result);
    await new Promise((resolve) => { setTimeout(resolve, 5); });
    assert.equal(c.isInflight(scenarioCase.input.key), false);
  },

  'timeout-second-caller': async (scenarioCase) => {
    const c = ObservedTimeoutCoalesce.create({ 'timeout': scenarioCase.input.coalesce.timeout });
    const deferred = Promise.withResolvers<string>();
    const firstCaller = c.run(scenarioCase.input.key, () => deferred.promise);
    await assert.rejects(firstCaller, CoalesceTimeoutError);
    assert.equal(c.isInflight(scenarioCase.input.key), true);
    const secondCaller = c.run(scenarioCase.input.key, () => deferred.promise);
    deferred.resolve(scenarioCase.input.result);
    const secondResult = await secondCaller;
    assert.equal(secondResult, scenarioCase.input.result);
    assert.equal(c.timeoutEvents.length, scenarioCase.expected.timeoutEvents);
  },

  'async-timeout-hook': async (scenarioCase) => {
    class RejectingTimeoutCoalesce<T> extends Coalesce<T> {
      protected override async onTimeout(): Promise<void> {
        await new Promise((resolve) => { setImmediate(resolve); });
        throw RuntimeError.create('timeout hook boom');
      }
    }
    let rejectionCount = 0;
    const onUnhandledRejection = (): void => { rejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const c = RejectingTimeoutCoalesce.create<string>({ 'timeout': scenarioCase.input.coalesce.timeout });
      const deferred = Promise.withResolvers<string>();
      const pending = c.run(scenarioCase.input.key, () => deferred.promise);
      await assert.rejects(pending, { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
      assert.equal(c.isInflight(scenarioCase.input.key), true);
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionCount, scenarioCase.expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },

  'rejecting-start-hook': async (scenarioCase) => {
    const startGate = Promise.withResolvers<void>();
    class RejectingStartCoalesce<T> extends Coalesce<T> {
      readonly settledEvents: boolean[] = [];

      static override create<T>(options?: CoalesceOptionsEntity.InputType): RejectingStartCoalesce<T> {
        return new RejectingStartCoalesce<T>(CoalesceOptionsEntity.intake(options ?? {}));
      }
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
    const leader = c.run(scenarioCase.input.key, factory);
    const joiner = c.run(scenarioCase.input.key, factory);
    assert.equal(c.isInflight(scenarioCase.input.key), true);
    assert.equal(calls, 0);
    startGate.reject(RuntimeError.create(scenarioCase.input.message));
    await Promise.all([assert.rejects(leader, HookInvocationError), assert.rejects(joiner, HookInvocationError)]);
    assert.equal(calls, 0);
    assert.equal(c.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightAfter);
    assert.deepEqual(c.settledEvents, scenarioCase.expected.settledEvents);
  },

  'throwing-settled-hook': async (scenarioCase) => {
    class ThrowingSettledCoalesce<T> extends Coalesce<T> {
      protected override onCoalesceSettled(): void {
        throw RuntimeError.create(scenarioCase.input.settledMessage);
      }
    }
    const resolved = ThrowingSettledCoalesce.create<string>();
    await assert.rejects(() => resolved.run(scenarioCase.input.firstKey, async () => 'value'), HookInvocationError);
    assert.equal(resolved.isInflight(scenarioCase.input.firstKey), scenarioCase.expected.inflightAfter);
    const rejected = ThrowingSettledCoalesce.create<string>();
    await assert.rejects(() => rejected.run(scenarioCase.input.secondKey, async () => { throw RuntimeError.create(scenarioCase.input.factoryMessage); }), HookInvocationError);
    assert.equal(rejected.isInflight(scenarioCase.input.secondKey), scenarioCase.expected.inflightAfter);
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await scenarioRunners[scenarioCase.shape](scenarioCase);
}

const fileIntake = ScenarioFileCompiler.compileIntake(CoalesceScenarioCaseEntity.Schema, CoalesceScenarioCaseEntity.Node);

void describe('Coalesce', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
