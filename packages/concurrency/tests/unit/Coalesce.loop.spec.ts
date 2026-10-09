import { HookInvocationError, RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { Coalesce } from '../../src/Coalesce.js';
import { CoalesceOptionsEntity } from '../../src/entities/CoalesceOptionsEntity.js';
import { CoalesceTimeoutError } from '../../src/errors/CoalesceTimeoutError.js';
import { ErrorCapture } from '../helpers/ErrorCapture.js';
import scenarioGroups from './Coalesce.scenarios.json' with { 'type': 'json' };
import { CoalesceScenarioCaseEntity } from './entities/CoalesceScenarioCaseEntity.js';

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

class RejectingTimeoutCoalesce<T> extends Coalesce<T> {
  static override create<T>(options?: CoalesceOptionsEntity.InputType): RejectingTimeoutCoalesce<T> {
    return new RejectingTimeoutCoalesce<T>(CoalesceOptionsEntity.intake(options ?? {}));
  }

  protected override async onTimeout(): Promise<void> {
    await new Promise((resolve) => { setImmediate(resolve); });
    throw RuntimeError.create('timeout hook boom');
  }
}

class RejectingJoinCoalesce extends Coalesce<string> {
  readonly settledEvents: boolean[] = [];
  readonly #message: string;

  constructor(message: string) {
    super(CoalesceOptionsEntity.intake({}));
    this.#message = message;
  }

  protected override onCoalesceJoin(): void {
    throw RuntimeError.create(this.#message);
  }
  protected override onCoalesceSettled(_key: string, success: boolean): void {
    this.settledEvents.push(success);
  }
}

class GatedStartCoalesce extends Coalesce<string> {
  readonly settledEvents: boolean[] = [];
  readonly #gate: Promise<void>;

  private constructor(gate: Promise<void>) {
    super(CoalesceOptionsEntity.intake({}));
    this.#gate = gate;
  }

  static make(gate: Promise<void>): GatedStartCoalesce {
    return new GatedStartCoalesce(gate);
  }

  protected override onCoalesceStart(): Promise<void> {
    return this.#gate;
  }

  protected override onCoalesceSettled(_key: string, success: boolean): void {
    this.settledEvents.push(success);
  }
}

class ThrowingSettledCoalesce extends Coalesce<string> {
  readonly #message: string;

  constructor(message: string) {
    super(CoalesceOptionsEntity.intake({}));
    this.#message = message;
  }

  protected override onCoalesceSettled(): void {
    throw RuntimeError.create(this.#message);
  }
}

class CoalesceRunners {
  static async 'async-timeout-hook'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'async-timeout-hook'>): Promise<void> {
    let rejectionCount = 0;
    const onUnhandledRejection = (): void => { rejectionCount += 1; };
    process.on('unhandledRejection', onUnhandledRejection);
    try {
      const c = RejectingTimeoutCoalesce.create<string>({ 'timeout': scenarioCase.input.coalesce.timeout });
      const deferred = Promise.withResolvers<string>();
      const pending = c.run(scenarioCase.input.key, () => {return deferred.promise;});
      await assert.rejects(pending, { 'hookName': scenarioCase.expected.hookName, 'name': HookInvocationError.name });
      assert.equal(c.isInflight(scenarioCase.input.key), true);
      await new Promise((resolve) => { setImmediate(resolve); });
      assert.equal(rejectionCount, scenarioCase.expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'coalesce-start-hooks'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'coalesce-start-hooks'>): Promise<void> {
    const c = ObservedCoalesce.create();
    await Promise.all([c.run(scenarioCase.input.key, CoalesceRunners.delayedStringFactory), c.run(scenarioCase.input.key, CoalesceRunners.delayedStringFactory), c.run(scenarioCase.input.key, CoalesceRunners.delayedStringFactory)]);
    assert.equal(c.startEvents.length, scenarioCase.expected.startCount);
    assert.equal(c.joinEvents.length, scenarioCase.expected.joinCount);
    assert.deepEqual(c.startEvents, [scenarioCase.input.key]);
    assert.deepEqual(c.joinEvents, [scenarioCase.input.key, scenarioCase.input.key]);
  }

  static async 'factory-error-cleanup'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'factory-error-cleanup'>): Promise<void> {
    const coalesce = Coalesce.create<string>();
    const error = await ErrorCapture.rejection(coalesce.run(scenarioCase.input.key, async () => {
      return await Promise.reject(RuntimeError.create(scenarioCase.input.message));
    }));
    assert.ok(error.message.includes(scenarioCase.input.message));
    assert.equal(coalesce.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightAfter);
  }

  static async 'factory-throw'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'factory-throw'>): Promise<void> {
    const coalesce = Coalesce.create<string>();
    const error = await ErrorCapture.rejection(coalesce.run(scenarioCase.input.key, () => { throw RuntimeError.create(scenarioCase.input.message); }));
    assert.ok(error.message.includes(scenarioCase.input.message));
    assert.equal(coalesce.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightAfter);
  }

  static async 'independent-keys'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'independent-keys'>): Promise<void> {
    const coalesce = Coalesce.create<number>();
    let calls = 0;
    const factory = (n: number) => {
      const produce = (): Promise<number> => {
        calls += 1;
        const result = Promise.resolve(n);
        return result;
      };
      return produce;
    };
    const [a, b] = await Promise.all([coalesce.run(scenarioCase.input.keyA, factory(scenarioCase.input.valueA)), coalesce.run(scenarioCase.input.keyB, factory(scenarioCase.input.valueB))]);
    assert.equal(calls, scenarioCase.expected.callCount);
    assert.equal(a, scenarioCase.expected.resultA);
    assert.equal(b, scenarioCase.expected.resultB);
  }

  static async 'inflight-state'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'inflight-state'>): Promise<void> {
    const coalesce = Coalesce.create<string>();
    const deferred = Promise.withResolvers<string>();
    const pending = coalesce.run(scenarioCase.input.key, () => {return deferred.promise;});
    assert.equal(coalesce.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightBefore);
    deferred.resolve(scenarioCase.input.result);
    await pending;
    assert.equal(coalesce.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightAfter);
  }

  static async 'join-hook-rejects'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'join-hook-rejects'>): Promise<void> {
    const c = new RejectingJoinCoalesce(scenarioCase.input.message);
    const deferred = Promise.withResolvers<string>();
    const leader = c.run(scenarioCase.input.key, () => {return deferred.promise;});
    const joiner = c.run(scenarioCase.input.key, async () => { return await Promise.resolve('unused'); });
    await assert.rejects(joiner, HookInvocationError);
    deferred.resolve('shared');
    await leader;
    assert.deepEqual(c.settledEvents, scenarioCase.expected.settledEvents);
  }

  static async 'no-timeout'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'no-timeout'>): Promise<void> {
    const c = Coalesce.create<string>();
    const factory = (): Promise<string> => {
      const pending = new Promise<string>((resolve) => {
        setTimeout(() => { resolve(scenarioCase.input.result); }, scenarioCase.input.delayMs);
      });
      return pending;
    };
    const result = await c.run(scenarioCase.input.key, factory);
    assert.equal(result, scenarioCase.expected.result);
  }

  static async 'rejecting-start-hook'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'rejecting-start-hook'>): Promise<void> {
    const startGate = Promise.withResolvers<void>();
    const c = GatedStartCoalesce.make(startGate.promise);
    let calls = 0;
    const factory = async (): Promise<string> => { calls += 1; return await Promise.resolve('ok'); };
    const leader = c.run(scenarioCase.input.key, factory);
    const joiner = c.run(scenarioCase.input.key, factory);
    assert.equal(c.isInflight(scenarioCase.input.key), true);
    assert.equal(calls, 0);
    startGate.reject(RuntimeError.create(scenarioCase.input.message));
    await Promise.all([assert.rejects(leader, HookInvocationError), assert.rejects(joiner, HookInvocationError)]);
    assert.equal(calls, 0);
    assert.equal(c.isInflight(scenarioCase.input.key), scenarioCase.expected.inflightAfter);
    assert.deepEqual(c.settledEvents, scenarioCase.expected.settledEvents);
  }

  static async 'sequential-calls'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'sequential-calls'>): Promise<void> {
    const coalesce = Coalesce.create<number>();
    let calls = 0;
    const factory = (): Promise<number> => {
      const result = Promise.resolve(++calls);
      return result;
    };
    await coalesce.run(scenarioCase.input.key, factory);
    await coalesce.run(scenarioCase.input.key, factory);
    assert.equal(calls, scenarioCase.expected.callCount);
  }

  static async 'settled-failure'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'settled-failure'>): Promise<void> {
    const c = ObservedCoalesce.create();
    const error = await ErrorCapture.rejection(c.run(scenarioCase.input.key, async () => {
      return await Promise.reject(RuntimeError.create(scenarioCase.input.message));
    }));
    assert.ok(error.message.includes(scenarioCase.input.message));
    assert.equal(c.settledEvents.length, 1);
    assert.deepEqual(c.settledEvents[0], { 'key': scenarioCase.input.key, 'success': scenarioCase.expected.success });
  }

  static async 'settled-success'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'settled-success'>): Promise<void> {
    const c = ObservedCoalesce.create();
    await c.run(scenarioCase.input.key, () => {
      const returned = Promise.resolve(scenarioCase.input.result);
      return returned;
    });
    assert.equal(c.settledEvents.length, 1);
    assert.deepEqual(c.settledEvents[0], { 'key': scenarioCase.input.key, 'success': scenarioCase.expected.success });
  }

  static async 'shared-factory'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'shared-factory'>): Promise<void> {
    const coalesce = Coalesce.create<string>();
    let calls = 0;
    const factory = (): Promise<string> => {
      calls += 1;
      const pending = new Promise<string>((resolve) => {
        setTimeout(() => { resolve(scenarioCase.input.result); }, scenarioCase.input.delayMs);
      });
      return pending;
    };
    const [a, b, c] = await Promise.all([coalesce.run(scenarioCase.input.key, factory), coalesce.run(scenarioCase.input.key, factory), coalesce.run(scenarioCase.input.key, factory)]);
    assert.equal(calls, scenarioCase.expected.callCount);
    assert.equal(a, scenarioCase.expected.result);
    assert.equal(b, scenarioCase.expected.result);
    assert.equal(c, scenarioCase.expected.result);
  }

  static async 'start-gate'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'start-gate'>): Promise<void> {
    const startGate = Promise.withResolvers<void>();
    let factoryCalls = 0;
    const c = GatedStartCoalesce.make(startGate.promise);
    const factory = async (): Promise<string> => {
      factoryCalls += 1;
      return await Promise.resolve('shared');
    };
    const leader = c.run(scenarioCase.input.key, factory);
    const joiner = c.run(scenarioCase.input.key, factory);
    assert.equal(c.isInflight(scenarioCase.input.key), scenarioCase.expected.inflight);
    assert.equal(factoryCalls, 0);
    startGate.resolve();
    assert.deepEqual(await Promise.all([leader, joiner]), ['shared', 'shared']);
    assert.equal(factoryCalls, scenarioCase.expected.factoryCalls);
    assert.equal(c.isInflight(scenarioCase.input.key), false);
  }

  static async 'throwing-settled-hook'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'throwing-settled-hook'>): Promise<void> {
    const resolved = new ThrowingSettledCoalesce(scenarioCase.input.settledMessage);
    await assert.rejects(() => {
      const result = resolved.run(scenarioCase.input.firstKey, async () => { return await Promise.resolve('value'); });
      return result;
    }, HookInvocationError);
    assert.equal(resolved.isInflight(scenarioCase.input.firstKey), scenarioCase.expected.inflightAfter);
    const rejected = new ThrowingSettledCoalesce(scenarioCase.input.settledMessage);
    await assert.rejects(() => {
      const result = rejected.run(scenarioCase.input.secondKey, async () => { return await Promise.reject(RuntimeError.create(scenarioCase.input.factoryMessage)); });
      return result;
    }, HookInvocationError);
    assert.equal(rejected.isInflight(scenarioCase.input.secondKey), scenarioCase.expected.inflightAfter);
  }

  static async 'timeout-rejects'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'timeout-rejects'>): Promise<void> {
    const c = ObservedTimeoutCoalesce.create({ 'timeout': scenarioCase.input.coalesce.timeout });
    const deferred = Promise.withResolvers<string>();
    const pending = c.run(scenarioCase.input.key, () => {return deferred.promise;});
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
  }

  static async 'timeout-second-caller'(scenarioCase: ScenarioCaseOfType<CoalesceScenarioCaseEntity.Type, 'timeout-second-caller'>): Promise<void> {
    const c = ObservedTimeoutCoalesce.create({ 'timeout': scenarioCase.input.coalesce.timeout });
    const deferred = Promise.withResolvers<string>();
    const firstCaller = c.run(scenarioCase.input.key, () => {return deferred.promise;});
    await assert.rejects(firstCaller, CoalesceTimeoutError);
    assert.equal(c.isInflight(scenarioCase.input.key), true);
    const secondCaller = c.run(scenarioCase.input.key, () => {return deferred.promise;});
    deferred.resolve(scenarioCase.input.result);
    const secondResult = await secondCaller;
    assert.equal(secondResult, scenarioCase.input.result);
    assert.equal(c.timeoutEvents.length, scenarioCase.expected.timeoutEvents);
  }

  private static delayedStringFactory(): Promise<string> {
    const pending = new Promise<string>((resolve) => {
      setTimeout(() => { resolve('v'); }, 10);
    });
    return pending;
  }
}

ScenarioSuite.register({
  'entity': CoalesceScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Coalesce',
  'runners': CoalesceRunners
});
