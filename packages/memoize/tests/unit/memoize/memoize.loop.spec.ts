import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

import type { MemoizeCollaboratorsInterface } from '../../../src/interfaces/index.js';
import type { MemoizeConfigEntity } from '../entities/MemoizeConfigEntity.js';

import { CacheLookupEntity } from '../../../src/entities/index.js';
import { Memoize, MemoizeConfigError } from '../../../src/index.js';
import { MemoizeScenarioCaseEntity } from '../entities/MemoizeScenarioCaseEntity.js';
import scenarioGroups from './memoize.scenarios.json' with { 'type': 'json' };

class MemoizeRunners {
  static async 'async-hooks-safe'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'async-hooks-safe'>): Promise<void> {
    const events: string[] = [];
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    const pending = Promise.withResolvers<string>();
    const memo = Memoize.create(
      async (_key: string) => {return await pending.promise;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );
    Object.defineProperty(memo, 'onMemoCoalesced', { 'value': MemoizeRunners.asyncFailingHook(events, 'coalesced', 'onMemoCoalesced') });
    Object.defineProperty(memo, 'onMemoHit', { 'value': MemoizeRunners.asyncFailingHook(events, 'hit', 'onMemoHit') });
    Object.defineProperty(memo, 'onMemoMiss', { 'value': MemoizeRunners.asyncFailingHook(events, 'miss', 'onMemoMiss') });

    try {
      const [leader, follower] = MemoizeRunners.createSameKeyCalls(memo, 'a', scenarioCase.input.batch.callCount);
      pending.resolve('value:a');

      assert.equal(await leader, scenarioCase.expected.leaderResult);
      assert.equal(await follower, scenarioCase.expected.followerResult);
      assert.equal(await memo.call('a'), scenarioCase.expected.cachedResult);

      await MemoizeRunners.waitForHookRejections();

      assert.deepEqual(events, scenarioCase.expected.events);
      assert.equal(rejectionEvents.length, scenarioCase.expected.rejectionEvents);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }

  static async 'clear-recomputes-all'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'clear-recomputes-all'>): Promise<void> {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}:${calls}`;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    await memo.call('a');
    await memo.call('b');
    memo.clear();
    await memo.call('a');
    await memo.call('b');

    assert.equal(calls, scenarioCase.expected.calls);
  }

  static async 'coalesce-shared-call'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'coalesce-shared-call'>): Promise<void> {
    let calls = 0;
    const pending = Promise.withResolvers<string>();
    const memo = Memoize.create(
      async (id: string) => {
        calls += 1;
        return `${id}:${await pending.promise}`;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    const callsForKey = MemoizeRunners.createSameKeyCalls(memo, 'x', scenarioCase.input.batch.callCount);
    pending.resolve('shared');
    const results = await Promise.all(callsForKey);

    assert.equal(calls, scenarioCase.expected.calls);
    assert.deepEqual(results, scenarioCase.expected.results);
  }

  static async 'coalesced-failure-recomputes'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'coalesced-failure-recomputes'>): Promise<void> {
    const events: string[] = [];
    let calls = 0;
    const pendingFailure = Promise.withResolvers<string>();
    const key = scenarioCase.input.key;

    class TrackingMemoize extends Memoize<[string], string> {
      protected override onMemoCoalesced(hookKey: string, argumentList: [string]): void {
        events.push(`coalesced:${hookKey}:${MemoizeRunners.formatArguments(argumentList)}`);
      }

      protected override onMemoHit(hookKey: string, argumentList: [string]): void {
        events.push(`hit:${hookKey}:${MemoizeRunners.formatArguments(argumentList)}`);
      }

      protected override onMemoMiss(hookKey: string, argumentList: [string]): void {
        events.push(`miss:${hookKey}:${MemoizeRunners.formatArguments(argumentList)}`);
      }
    }

    const memo = TrackingMemoize.create(
      async (_key: string) => {
        calls += 1;
        if (calls === 1) {
          return await pendingFailure.promise;
        }
        const result = scenarioCase.input.successValue;
        return result;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    const [leader, follower] = MemoizeRunners.createSameKeyCalls(memo, key, scenarioCase.input.batch.callCount);
    assert.ok(leader !== undefined);
    assert.ok(follower !== undefined);
    pendingFailure.reject(RuntimeError.create(scenarioCase.input.failureMessage));

    const leaderError = await leader.catch((error: Error) => {return error;});
    const followerError = await follower.catch((error: Error) => {return error;});
    assert.ok(leaderError instanceof Error);
    assert.ok(followerError instanceof Error);
    assert.equal(leaderError.message, scenarioCase.expected.firstErrorMessage);
    assert.equal(followerError.message, scenarioCase.expected.followerErrorMessage);

    assert.equal(await memo.call(key), scenarioCase.expected.second);
    assert.equal(await memo.call(key), scenarioCase.expected.third);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.deepEqual(events, scenarioCase.expected.events);
  }

  static async 'coalesced-hooks'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'coalesced-hooks'>): Promise<void> {
    const pending = Promise.withResolvers<string>();
    const events: string[] = [];

    class TrackedMemoize extends Memoize<[string], string> {
      protected override onMemoCoalesced(key: string): void {
        events.push(`coalesced:${key}`);
      }

      protected override onMemoMiss(key: string): void {
        events.push(`miss:${key}`);
      }
    }

    const memo = TrackedMemoize.create(
      async (id: string) => {return `${id}:${await pending.promise}`;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    const calls = MemoizeRunners.createSameKeyCalls(memo, 'x', scenarioCase.input.batch.callCount);
    pending.resolve('shared');
    await Promise.all(calls);

    assert.deepEqual(events, scenarioCase.expected.events);
  }

  static 'config-error'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'config-error'>): void {
    const error = new MemoizeConfigError('invalid memoize config');
    assert.equal(error.name, 'MemoizeConfigError');
    assert.equal(error.code, 'memoize.invalidConfig');
    assert.deepEqual(scenarioCase.expected, {});
  }

  static 'create-rejects-foreign-construction'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'create-rejects-foreign-construction'>): void {
    class ForeignMemoize extends Memoize<[string], string> {
      static override [Symbol.hasInstance](_candidate: unknown): boolean {
        return false;
      }
    }

    assert.throws(() => {
      ForeignMemoize.create(
        (id: string) => {return `value:${id}`;},
        ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
      );
    }, (error) => {
      assert.ok(error instanceof RuntimeError);
      assert.strictEqual(error.code, 'errors.runtime');
      assert.strictEqual(error.message, 'Memoize.create() did not construct the requested subclass.');
      return true;
    });
  }

  static async 'different-keys'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'different-keys'>): Promise<void> {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}`;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    assert.deepEqual(
      [await memo.call('a'), await memo.call('b')],
      scenarioCase.expected.results
    );
    assert.equal(calls, scenarioCase.expected.calls);
  }

  static 'entities'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'entities'>): void {
    assert.equal(CacheLookupEntity.validate({ 'found': true }), scenarioCase.expected.foundTrue);
    assert.equal(CacheLookupEntity.validate({ 'found': false }), scenarioCase.expected.foundFalse);
    assert.equal(CacheLookupEntity.validate({}), scenarioCase.expected.missingFalse);
  }

  static async 'failure-recomputes-after-rejection'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'failure-recomputes-after-rejection'>): Promise<void> {
    const events: string[] = [];
    let calls = 0;
    const key = scenarioCase.input.key;

    class TrackingMemoize extends Memoize<[string], string> {
      protected override onMemoHit(hookKey: string, argumentList: [string]): void {
        events.push(`hit:${hookKey}:${MemoizeRunners.formatArguments(argumentList)}`);
      }

      protected override onMemoMiss(hookKey: string, argumentList: [string]): void {
        events.push(`miss:${hookKey}:${MemoizeRunners.formatArguments(argumentList)}`);
      }
    }

    const memo = TrackingMemoize.create(
      async (_key: string) => {
        calls += 1;
        if (calls <= scenarioCase.input.failuresBeforeSuccess) {
          return await Promise.reject(RuntimeError.create(scenarioCase.input.failureMessage));
        }
        const result = scenarioCase.input.successValue;
        return result;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    await assert.rejects(memo.call(key), { 'message': scenarioCase.expected.firstErrorMessage });
    assert.equal(await memo.call(key), scenarioCase.expected.second);
    assert.equal(await memo.call(key), scenarioCase.expected.third);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.deepEqual(events, scenarioCase.expected.events);
  }

  static async 'hit-and-miss-hooks'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'hit-and-miss-hooks'>): Promise<void> {
    const events: string[] = [];

    class TrackedMemoize extends Memoize<[string, number], string> {
      protected override onMemoHit(key: string, argumentList: [string, number]): void {
        events.push(`hit:${key}:${MemoizeRunners.formatArguments(argumentList)}`);
      }

      protected override onMemoMiss(key: string, argumentList: [string, number]): void {
        events.push(`miss:${key}:${MemoizeRunners.formatArguments(argumentList)}`);
      }
    }

    const memo = TrackedMemoize.create(
      (id: string, revision: number) => {return `${id}@${revision}`;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.compoundKey)
    );

    await memo.call('order-1', 3);
    await memo.call('order-1', 3);

    assert.deepEqual(events, scenarioCase.expected.events);
  }

  static async 'hit-cache'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'hit-cache'>): Promise<void> {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}`;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    assert.equal(await memo.call('a'), scenarioCase.expected.first);
    assert.equal(await memo.call('a'), scenarioCase.expected.second);
    assert.equal(calls, scenarioCase.expected.calls);
  }

  static async 'invalidate-preserves-other-keys'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'invalidate-preserves-other-keys'>): Promise<void> {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}`;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    await memo.call('a');
    await memo.call('b');
    memo.invalidate('a');
    await memo.call('b');

    assert.equal(calls, scenarioCase.expected.calls);
  }

  static async 'invalidate-recomputes'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'invalidate-recomputes'>): Promise<void> {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}:${calls}`;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    assert.equal(await memo.call('a'), scenarioCase.expected.first);
    memo.invalidate('a');
    assert.equal(await memo.call('a'), scenarioCase.expected.second);
    assert.equal(calls, scenarioCase.expected.calls);
  }

  static async 'isolated-hook-ownership'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'isolated-hook-ownership'>): Promise<void> {
    class TrackedMemoize extends Memoize<[string, string], string> {
      readonly events: string[] = [];

      protected override onMemoCoalesced(key: string, argumentList: [string, string]): void {
        this.events.push(`coalesced:${key}:${argumentList[1]}`);
      }

      protected override onMemoMiss(key: string, argumentList: [string, string]): void {
        this.events.push(`miss:${key}:${argumentList[1]}`);
      }
    }

    const pendingA = Promise.withResolvers<string>();
    const pendingB = Promise.withResolvers<string>();
    const memoA = TrackedMemoize.create(
      async (_key: string, caller: string) => {return `${caller}:${await pendingA.promise}`;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );
    const memoB = TrackedMemoize.create(
      async (_key: string, caller: string) => {return `${caller}:${await pendingB.promise}`;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    const leaderA = memoA.call('shared', 'leader-a');
    const leaderB = memoB.call('shared', 'leader-b');
    const followerA = memoA.call('shared', 'follower-a');
    const followerB = memoB.call('shared', 'follower-b');

    assert.equal(scenarioCase.input.batch.callCount, 2);
    pendingA.resolve('result-a');
    pendingB.resolve('result-b');
    await Promise.all([leaderA, followerA, leaderB, followerB]);

    assert.deepEqual(memoA.events, scenarioCase.expected.memoAEvents);
    assert.deepEqual(memoB.events, scenarioCase.expected.memoBEvents);
  }

  static async 'miss-before-fn'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'miss-before-fn'>): Promise<void> {
    const events: string[] = [];

    class TrackedMemoize extends Memoize<[string], string> {
      protected override onMemoMiss(): void {
        events.push('miss');
      }
    }

    const memo = TrackedMemoize.create(
      (id: string) => {
        events.push('function');
        return `value:${id}`;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    await memo.call('a');
    assert.deepEqual(events, scenarioCase.expected.events);
  }

  static async 'per-key-hook-args'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'per-key-hook-args'>): Promise<void> {
    const pendingX = Promise.withResolvers<string>();
    const pendingY = Promise.withResolvers<string>();
    const missArgumentsByKey = new Map<string, [string, number]>();
    const coalescedArgumentsByKey = new Map<string, [string, number]>();

    class TrackedMemoize extends Memoize<[string, number], string> {
      protected override onMemoCoalesced(key: string, argumentList: [string, number]): void {
        coalescedArgumentsByKey.set(key, argumentList);
      }

      protected override onMemoMiss(key: string, argumentList: [string, number]): void {
        missArgumentsByKey.set(key, argumentList);
      }
    }

    const memo = TrackedMemoize.create(
      async (id: string, revision: number) => {
        const pending = id === 'x' ? pendingX.promise : pendingY.promise;
        return `${id}@${revision}:${await pending}`;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    const leaderX = memo.call('x', 1);
    const leaderY = memo.call('y', 2);
    const followerX = memo.call('x', 100);
    const followerY = memo.call('y', 200);

    assert.equal(scenarioCase.input.batch.callCount, 4);
    pendingX.resolve('resolved-x');
    pendingY.resolve('resolved-y');

    assert.deepEqual(
      await Promise.all([leaderX, leaderY, followerX, followerY]),
      scenarioCase.expected.results
    );
    assert.deepEqual(missArgumentsByKey, new Map(Object.entries(scenarioCase.expected.missArguments)));
    assert.deepEqual(coalescedArgumentsByKey, new Map(Object.entries(scenarioCase.expected.coalescedArguments)));
  }

  static async 'rejecting-coalesced-hook'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'rejecting-coalesced-hook'>): Promise<void> {
    const pending = Promise.withResolvers<string>();

    const memo = Memoize.create<[string], string>(
      async (id: string) => {return `${id}:${await pending.promise}`;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );
    Object.defineProperty(memo, 'onMemoCoalesced', { 'value': MemoizeRunners.asyncFailingHook([], 'coalesced', 'onMemoCoalesced') });

    const calls = MemoizeRunners.createSameKeyCalls(memo, 'x', scenarioCase.input.batch.callCount);
    pending.resolve('shared');

    assert.deepEqual(
      [...await Promise.all(calls), await memo.call('x')],
      scenarioCase.expected.results
    );
  }

  static async 'rejecting-miss-hook'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'rejecting-miss-hook'>): Promise<void> {
    const memo = Memoize.create(
      (id: string) => {return `value:${id}`;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );
    Object.defineProperty(memo, 'onMemoMiss', { 'value': MemoizeRunners.asyncFailingHook([], 'miss', 'onMemoMiss') });

    assert.equal(await memo.call('a'), scenarioCase.expected.first);
    assert.equal(await memo.call('a'), scenarioCase.expected.second);
  }

  static async 'sync-fn'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'sync-fn'>): Promise<void> {
    let calls = 0;
    const memo = Memoize.create(
      (value: number) => {
        calls += 1;
        const result = value * 2;
        return result;
      },
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.numberKey)
    );

    assert.deepEqual([await memo.call(21), await memo.call(21)], scenarioCase.expected.results);
    assert.equal(calls, scenarioCase.expected.calls);
  }

  static async 'throwing-coalesced-hook'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'throwing-coalesced-hook'>): Promise<void> {
    const pending = Promise.withResolvers<string>();

    class ThrowingCoalescedMemoize extends Memoize<[string], string> {
      protected override onMemoCoalesced(): void {
        throw RuntimeError.create('onMemoCoalesced boom');
      }
    }

    const memo = ThrowingCoalescedMemoize.create(
      async (id: string) => {return `${id}:${await pending.promise}`;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    const calls = MemoizeRunners.createSameKeyCalls(memo, 'x', scenarioCase.input.batch.callCount);
    pending.resolve('shared');

    assert.deepEqual(
      [...await Promise.all(calls), await memo.call('x')],
      scenarioCase.expected.results
    );
  }

  static async 'throwing-hit-hook'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'throwing-hit-hook'>): Promise<void> {
    class ThrowingHitMemoize extends Memoize<[string], string> {
      protected override onMemoHit(): void {
        throw RuntimeError.create('onMemoHit boom');
      }
    }

    const memo = ThrowingHitMemoize.create(
      (id: string) => {return `value:${id}`;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    await memo.call('a');
    assert.equal(await memo.call('a'), scenarioCase.expected.value);
  }

  static async 'throwing-miss-hook'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'throwing-miss-hook'>): Promise<void> {
    class ThrowingMissMemoize extends Memoize<[string], string> {
      protected override onMemoMiss(): void {
        throw RuntimeError.create('onMemoMiss boom');
      }
    }

    const memo = ThrowingMissMemoize.create(
      (id: string) => {return `value:${id}`;},
      ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    assert.equal(await memo.call('a'), scenarioCase.expected.first);
    assert.equal(await memo.call('a'), scenarioCase.expected.second);
  }

  static async 'ttl-stale-options'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'ttl-stale-options'>): Promise<void> {
    const ttlMs = scenarioCase.input.memoize.ttlMs;
    let calls = 0;
    mock.timers.enable({ 'apis': ['Date'], 'now': 0 });

    try {

      const memo = Memoize.create(
        (id: string) => {
          calls += 1;
          return `value:${id}:${calls}`;
        },
        ...MemoizeRunners.memoizeOptions(scenarioCase.input.memoize, MemoizeRunners.identityKey)
      );

      assert.equal(await memo.call('a'), scenarioCase.expected.first);
      assert.equal(await memo.call('a'), scenarioCase.expected.second);
      assert.equal(calls, scenarioCase.expected.calls);

      // Advance the mocked clock past the configured ttlMs. This proves ttlMs
      // actually reached the underlying LruCache: an entry that never received
      // the option would keep replaying the first computed value forever.
      mock.timers.tick(ttlMs + 1);
      assert.equal(await memo.call('a'), scenarioCase.expected.afterExpiry);
      assert.equal(calls, scenarioCase.expected.callsAfterExpiry);
    } finally {
      mock.timers.reset();
    }
  }

  static async 'undefined-result-cache'(scenarioCase: ScenarioCaseOfType<MemoizeScenarioCaseEntity.Type, 'undefined-result-cache'>): Promise<void> {
    let calls = 0;
    const key = scenarioCase.input.key;
    const memo = Memoize.create<[string], undefined>(
      (_key: string) => {
        calls += 1;
        return undefined;
      },
      ...MemoizeRunners.memoizeOptions<[string]>(scenarioCase.input.memoize, MemoizeRunners.identityKey)
    );

    const first = await memo.call(key);
    const second = await memo.call(key);
    assert.equal(typeof first, scenarioCase.expected.resultType);
    assert.equal(typeof second, scenarioCase.expected.resultType);
    assert.equal(calls, scenarioCase.expected.calls);
  }

  private static memoizeOptions<TArgumentList extends unknown[]>(config: MemoizeConfigEntity.Type, keyDeriver: (...argumentList: TArgumentList) => string): readonly [unknown, MemoizeCollaboratorsInterface<TArgumentList>] {
    return [
      {
        'capacity': config.capacity,
        ...(config.staleMs === undefined ? {} : { 'staleMs': config.staleMs }),
        ...(config.ttlMs === undefined ? {} : { 'ttlMs': config.ttlMs })
      },
      { 'keyDeriver': keyDeriver }
    ];
  }

  private static identityKey(id: string): string {
    assert.equal(typeof id, 'string');
    return id;
  }

  private static compoundKey(id: string, revision: number): string {
    const key = `${id}:${revision}`;
    return key;
  }

  private static numberKey(value: number): string {
    assert.equal(typeof value, 'number');
    const key = String(value);
    return key;
  }

  private static formatArguments(argumentList: readonly (number | string)[]): string {
    const formatted = argumentList.map((entry) => {
      const text = typeof entry === 'string' ? `"${entry}"` : String(entry);
      return text;
    });
    return `[${formatted.join(',')}]`;
  }

  private static asyncFailingHook(events: string[], label: string, hookName: string): () => Promise<void> {
    const hook = async (): Promise<void> => {
      events.push(label);
      await Promise.resolve();
      throw RuntimeError.create(`${hookName} async boom`);
    };
    return hook;
  }

  private static createSameKeyCalls<TResult>(memo: Memoize<[string], TResult>, key: string, count: number): Promise<TResult>[] {
    const calls: Promise<TResult>[] = [];
    for (let index = 0; index < count; index += 1) {
      calls.push(memo.call(key));
    }
    return calls;
  }

  private static async waitForHookRejections(): Promise<void> {
    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });
  }
}

ScenarioSuite.register({
  'entity': MemoizeScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Memoize',
  'runners': MemoizeRunners
});
