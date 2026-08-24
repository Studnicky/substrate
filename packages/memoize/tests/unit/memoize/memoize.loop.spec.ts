import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  Memoize,
  MemoizeConfigError
} from '../../../src/index.js';
import { CacheLookupEntity } from '../../../src/entities/index.js';
import type { MemoizeOptionsInterface } from '../../../src/interfaces/index.js';
import scenarioGroups from './memoize.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'async-hooks-safe'
  | 'clear-recomputes-all'
  | 'coalesce-shared-call'
  | 'coalesced-failure-recomputes'
  | 'coalesced-hooks'
  | 'config-error'
  | 'create-rejects-foreign-construction'
  | 'different-keys'
  | 'entities'
  | 'failure-recomputes-after-rejection'
  | 'hit-and-miss-hooks'
  | 'hit-cache'
  | 'invalidate-preserves-other-keys'
  | 'invalidate-recomputes'
  | 'isolated-hook-ownership'
  | 'miss-before-fn'
  | 'per-key-hook-args'
  | 'rejecting-coalesced-hook'
  | 'rejecting-miss-hook'
  | 'sync-fn'
  | 'throwing-coalesced-hook'
  | 'throwing-hit-hook'
  | 'throwing-miss-hook'
  | 'ttl-stale-options'
  | 'undefined-result-cache';

type KeyFnShape = 'compound' | 'identity' | 'number-string';

type MemoizeConfigInput = {
  capacity: number;
  keyFnShape: KeyFnShape;
  staleMs?: number;
  ttlMs?: number;
};

type BatchInput = {
  callCount?: number;
};

type ScenarioInput = {
  batch?: BatchInput;
  failureMessage?: string;
  failuresBeforeSuccess?: number;
  key?: string;
  memoize: MemoizeConfigInput;
  successValue?: string;
};

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: ScenarioInput;
  shape: ScenarioShape;
  name: string;
};

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

const keyFnMap = {
  compound: (id: string, revision: number): string => `${id}:${revision}`,
  identity: (id: string): string => id,
  'number-string': (value: number): string => String(value)
} satisfies Record<KeyFnShape, (...args: never[]) => string>;

function memoizeOptions<TArgs extends unknown[]>(
  config: MemoizeConfigInput,
  keyFn: (...args: TArgs) => string
): MemoizeOptionsInterface<TArgs> {
  return {
    capacity: config.capacity,
    'keyDeriver': keyFn,
    ...(config.staleMs === undefined ? {} : { staleMs: config.staleMs }),
    ...(config.ttlMs === undefined ? {} : { ttlMs: config.ttlMs })
  };
}

function readString<TValue>(value: TValue, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  return value;
}

function readNumber<TValue>(value: TValue, label: string): number {
  if (typeof value !== 'number') {
    throw new Error(`${label} must be a number`);
  }
  return value;
}

function readStringArray<TValue>(value: TValue, label: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${label} must be a string array`);
  }
  return value;
}

function readTupleRecord<TValue>(value: TValue, label: string): Record<string, [string, number]> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a tuple record`);
  }

  const result: Record<string, [string, number]> = {};
  for (const [key, tuple] of Object.entries(value)) {
    if (!Array.isArray(tuple) || tuple.length !== 2 || typeof tuple[0] !== 'string' || typeof tuple[1] !== 'number') {
      throw new Error(`${label}.${key} must be a [string, number] tuple`);
    }
    result[key] = [tuple[0], tuple[1]];
  }
  return result;
}

function readBatchCallCount(scenarioCase: ScenarioCase): number {
  const value = scenarioCase.input.batch?.callCount;
  if (typeof value !== 'number') {
    throw new Error(`${scenarioCase.name} must define input.batch.callCount`);
  }
  return value;
}

function noop<T>(_value: T): void {}

function createPendingValue<T>(): {
  promise: Promise<T>;
  reject: (error: Error) => void;
  resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = noop;
  let reject: (error: Error) => void = noop;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, reject, resolve };
}

function createSameKeyCalls<TResult>(
  memo: Memoize<[string], TResult>,
  key: string,
  count: number
): Array<Promise<TResult>> {
  return Array.from({ length: count }, () => memo.call(key));
}

async function waitForHookRejections(): Promise<void> {
  await new Promise((resolve) => { setImmediate(resolve); });
  await new Promise((resolve) => { setImmediate(resolve); });
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'async-hooks-safe': async (scenarioCase) => {
    const events: string[] = [];
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { rejectionEvents.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    class AsyncRejectingHooksMemoize extends Memoize<[string], string> {
      protected override async onMemoCoalesced(): Promise<void> {
        events.push('coalesced');
        await Promise.resolve();
        throw new Error('onMemoCoalesced async boom');
      }

      protected override async onMemoHit(): Promise<void> {
        events.push('hit');
        await Promise.resolve();
        throw new Error('onMemoHit async boom');
      }

      protected override async onMemoMiss(): Promise<void> {
        events.push('miss');
        await Promise.resolve();
        throw new Error('onMemoMiss async boom');
      }
    }

    const pending = createPendingValue<string>();
    const memo = AsyncRejectingHooksMemoize.create(
      async (_key: string) => pending.promise,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    try {
      const [leader, follower] = createSameKeyCalls(memo, 'a', readBatchCallCount(scenarioCase));
      pending.resolve('value:a');

      assert.equal(await leader, scenarioCase.expected.leaderResult);
      assert.equal(await follower, scenarioCase.expected.followerResult);
      assert.equal(await memo.call('a'), scenarioCase.expected.cachedResult);

      await waitForHookRejections();

      assert.deepEqual(events, readStringArray(scenarioCase.expected.events, 'Scenario expected.events'));
      assert.equal(rejectionEvents.length, scenarioCase.expected.rejectionEvents);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  },
  'clear-recomputes-all': async (scenarioCase) => {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}:${calls}`;
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    await memo.call('a');
    await memo.call('b');
    memo.clear();
    await memo.call('a');
    await memo.call('b');

    assert.equal(calls, scenarioCase.expected.calls);
  },
  'coalesce-shared-call': async (scenarioCase) => {
    let calls = 0;
    const pending = createPendingValue<string>();
    const memo = Memoize.create(
      async (id: string) => {
        calls += 1;
        return `${id}:${await pending.promise}`;
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    const callsForKey = createSameKeyCalls(memo, 'x', readBatchCallCount(scenarioCase));
    pending.resolve('shared');
    const results = await Promise.all(callsForKey);

    assert.equal(calls, scenarioCase.expected.calls);
    assert.deepEqual(results, readStringArray(scenarioCase.expected.results, 'Scenario expected.results'));
  },
  'coalesced-failure-recomputes': async (scenarioCase) => {
    const events: string[] = [];
    let calls = 0;
    const pendingFailure = createPendingValue<string>();
    const key = readString(scenarioCase.input.key, 'Scenario input.key');

    class TrackingMemoize extends Memoize<[string], string> {
      protected override onMemoCoalesced(hookKey: string, args: [string]): void {
        events.push(`coalesced:${hookKey}:${JSON.stringify(args)}`);
      }

      protected override onMemoHit(hookKey: string, args: [string]): void {
        events.push(`hit:${hookKey}:${JSON.stringify(args)}`);
      }

      protected override onMemoMiss(hookKey: string, args: [string]): void {
        events.push(`miss:${hookKey}:${JSON.stringify(args)}`);
      }
    }

    const memo = TrackingMemoize.create(
      async (_key: string) => {
        calls += 1;
        if (calls === 1) {
          return pendingFailure.promise;
        }
        return readString(scenarioCase.input.successValue, 'Scenario input.successValue');
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    const [leader, follower] = createSameKeyCalls(memo, key, readBatchCallCount(scenarioCase));
    assert.ok(leader !== undefined);
    assert.ok(follower !== undefined);
    pendingFailure.reject(new Error(readString(scenarioCase.input.failureMessage, 'Scenario input.failureMessage')));

    const leaderError = await leader.catch((error: Error) => error);
    const followerError = await follower.catch((error: Error) => error);
    assert.ok(leaderError instanceof Error);
    assert.ok(followerError instanceof Error);
    assert.equal(leaderError.message, scenarioCase.expected.firstErrorMessage);
    assert.equal(followerError.message, scenarioCase.expected.followerErrorMessage);

    assert.equal(await memo.call(key), scenarioCase.expected.second);
    assert.equal(await memo.call(key), scenarioCase.expected.third);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.deepEqual(events, readStringArray(scenarioCase.expected.events, 'Scenario expected.events'));
  },
  'coalesced-hooks': async (scenarioCase) => {
    const pending = createPendingValue<string>();
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
      async (id: string) => `${id}:${await pending.promise}`,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    const calls = createSameKeyCalls(memo, 'x', readBatchCallCount(scenarioCase));
    pending.resolve('shared');
    await Promise.all(calls);

    assert.deepEqual(events, readStringArray(scenarioCase.expected.events, 'Scenario expected.events'));
  },
  'config-error': (scenarioCase) => {
    const error = new MemoizeConfigError('invalid memoize config');
    assert.equal(error.name, 'MemoizeConfigError');
    assert.equal(error.code, 'memoize.invalidConfig');
    assert.deepEqual(scenarioCase.expected, {});
  },
  'create-rejects-foreign-construction': (scenarioCase) => {
    class ForeignMemoize extends Memoize<[string], string> {
      protected constructor(deps: never) {
        super(deps);
        return Object.create(null);
      }
    }

    assert.throws(() => {
      ForeignMemoize.create(
        (id: string) => `value:${id}`,
        memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
      );
    }, TypeError);
  },
  'different-keys': async (scenarioCase) => {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}`;
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    assert.deepEqual(
      [await memo.call('a'), await memo.call('b')],
      readStringArray(scenarioCase.expected.results, 'Scenario expected.results')
    );
    assert.equal(calls, scenarioCase.expected.calls);
  },
  entities: (scenarioCase) => {
    assert.equal(CacheLookupEntity.validate({ found: true }), scenarioCase.expected.foundTrue);
    assert.equal(CacheLookupEntity.validate({ found: false }), scenarioCase.expected.foundFalse);
    assert.equal(CacheLookupEntity.validate({}), scenarioCase.expected.missingFalse);
  },
  'failure-recomputes-after-rejection': async (scenarioCase) => {
    const events: string[] = [];
    let calls = 0;
    const key = readString(scenarioCase.input.key, 'Scenario input.key');

    class TrackingMemoize extends Memoize<[string], string> {
      protected override onMemoHit(hookKey: string, args: [string]): void {
        events.push(`hit:${hookKey}:${JSON.stringify(args)}`);
      }

      protected override onMemoMiss(hookKey: string, args: [string]): void {
        events.push(`miss:${hookKey}:${JSON.stringify(args)}`);
      }
    }

    const memo = TrackingMemoize.create(
      async (_key: string) => {
        calls += 1;
        if (calls <= readNumber(scenarioCase.input.failuresBeforeSuccess, 'Scenario input.failuresBeforeSuccess')) {
          throw new Error(readString(scenarioCase.input.failureMessage, 'Scenario input.failureMessage'));
        }
        return readString(scenarioCase.input.successValue, 'Scenario input.successValue');
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    await assert.rejects(memo.call(key), { message: scenarioCase.expected.firstErrorMessage });
    assert.equal(await memo.call(key), scenarioCase.expected.second);
    assert.equal(await memo.call(key), scenarioCase.expected.third);
    assert.equal(calls, scenarioCase.expected.calls);
    assert.deepEqual(events, readStringArray(scenarioCase.expected.events, 'Scenario expected.events'));
  },
  'hit-and-miss-hooks': async (scenarioCase) => {
    const events: string[] = [];

    class TrackedMemoize extends Memoize<[string, number], string> {
      protected override onMemoHit(key: string, args: [string, number]): void {
        events.push(`hit:${key}:${JSON.stringify(args)}`);
      }

      protected override onMemoMiss(key: string, args: [string, number]): void {
        events.push(`miss:${key}:${JSON.stringify(args)}`);
      }
    }

    const memo = TrackedMemoize.create(
      (id: string, revision: number) => `${id}@${revision}`,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.compound)
    );

    await memo.call('order-1', 3);
    await memo.call('order-1', 3);

    assert.deepEqual(events, readStringArray(scenarioCase.expected.events, 'Scenario expected.events'));
  },
  'hit-cache': async (scenarioCase) => {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}`;
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    assert.equal(await memo.call('a'), scenarioCase.expected.first);
    assert.equal(await memo.call('a'), scenarioCase.expected.second);
    assert.equal(calls, scenarioCase.expected.calls);
  },
  'invalidate-preserves-other-keys': async (scenarioCase) => {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}`;
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    await memo.call('a');
    await memo.call('b');
    memo.invalidate('a');
    await memo.call('b');

    assert.equal(calls, scenarioCase.expected.calls);
  },
  'invalidate-recomputes': async (scenarioCase) => {
    let calls = 0;
    const memo = Memoize.create(
      (id: string) => {
        calls += 1;
        return `value:${id}:${calls}`;
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    assert.equal(await memo.call('a'), scenarioCase.expected.first);
    memo.invalidate('a');
    assert.equal(await memo.call('a'), scenarioCase.expected.second);
    assert.equal(calls, scenarioCase.expected.calls);
  },
  'isolated-hook-ownership': async (scenarioCase) => {
    class TrackedMemoize extends Memoize<[string, string], string> {
      readonly events: string[] = [];

      protected override onMemoCoalesced(key: string, args: [string, string]): void {
        this.events.push(`coalesced:${key}:${args[1]}`);
      }

      protected override onMemoMiss(key: string, args: [string, string]): void {
        this.events.push(`miss:${key}:${args[1]}`);
      }
    }

    const pendingA = createPendingValue<string>();
    const pendingB = createPendingValue<string>();
    const memoA = TrackedMemoize.create(
      async (_key: string, caller: string) => `${caller}:${await pendingA.promise}`,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );
    const memoB = TrackedMemoize.create(
      async (_key: string, caller: string) => `${caller}:${await pendingB.promise}`,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    const leaderA = memoA.call('shared', 'leader-a');
    const leaderB = memoB.call('shared', 'leader-b');
    const followerA = memoA.call('shared', 'follower-a');
    const followerB = memoB.call('shared', 'follower-b');

    assert.equal(readBatchCallCount(scenarioCase), 2);
    pendingA.resolve('result-a');
    pendingB.resolve('result-b');
    await Promise.all([leaderA, followerA, leaderB, followerB]);

    assert.deepEqual(memoA.events, readStringArray(scenarioCase.expected.memoAEvents, 'Scenario expected.memoAEvents'));
    assert.deepEqual(memoB.events, readStringArray(scenarioCase.expected.memoBEvents, 'Scenario expected.memoBEvents'));
  },
  'miss-before-fn': async (scenarioCase) => {
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
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    await memo.call('a');
    assert.deepEqual(events, readStringArray(scenarioCase.expected.events, 'Scenario expected.events'));
  },
  'per-key-hook-args': async (scenarioCase) => {
    const pendingX = createPendingValue<string>();
    const pendingY = createPendingValue<string>();
    const missArgsByKey = new Map<string, [string, number]>();
    const coalescedArgsByKey = new Map<string, [string, number]>();

    class TrackedMemoize extends Memoize<[string, number], string> {
      protected override onMemoCoalesced(key: string, args: [string, number]): void {
        coalescedArgsByKey.set(key, args);
      }

      protected override onMemoMiss(key: string, args: [string, number]): void {
        missArgsByKey.set(key, args);
      }
    }

    const memo = TrackedMemoize.create(
      async (id: string, revision: number) => {
        const pending = id === 'x' ? pendingX.promise : pendingY.promise;
        return `${id}@${revision}:${await pending}`;
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    const leaderX = memo.call('x', 1);
    const leaderY = memo.call('y', 2);
    const followerX = memo.call('x', 100);
    const followerY = memo.call('y', 200);

    assert.equal(readBatchCallCount(scenarioCase), 4);
    pendingX.resolve('resolved-x');
    pendingY.resolve('resolved-y');

    assert.deepEqual(
      await Promise.all([leaderX, leaderY, followerX, followerY]),
      readStringArray(scenarioCase.expected.results, 'Scenario expected.results')
    );
    assert.deepEqual(Object.fromEntries(missArgsByKey), readTupleRecord(scenarioCase.expected.missArgs, 'Scenario expected.missArgs'));
    assert.deepEqual(Object.fromEntries(coalescedArgsByKey), readTupleRecord(scenarioCase.expected.coalescedArgs, 'Scenario expected.coalescedArgs'));
  },
  'rejecting-coalesced-hook': async (scenarioCase) => {
    const pending = createPendingValue<string>();

    class RejectingCoalescedMemoize extends Memoize<[string], string> {
      protected override async onMemoCoalesced(): Promise<void> {
        await Promise.resolve();
        throw new Error('onMemoCoalesced async boom');
      }
    }

    const memo = RejectingCoalescedMemoize.create(
      async (id: string) => `${id}:${await pending.promise}`,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    const calls = createSameKeyCalls(memo, 'x', readBatchCallCount(scenarioCase));
    pending.resolve('shared');

    assert.deepEqual(
      [...await Promise.all(calls), await memo.call('x')],
      readStringArray(scenarioCase.expected.results, 'Scenario expected.results')
    );
  },
  'rejecting-miss-hook': async (scenarioCase) => {
    class RejectingMissMemoize extends Memoize<[string], string> {
      protected override async onMemoMiss(): Promise<void> {
        await Promise.resolve();
        throw new Error('onMemoMiss async boom');
      }
    }

    const memo = RejectingMissMemoize.create(
      (id: string) => `value:${id}`,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    assert.equal(await memo.call('a'), scenarioCase.expected.first);
    assert.equal(await memo.call('a'), scenarioCase.expected.second);
  },
  'sync-fn': async (scenarioCase) => {
    let calls = 0;
    const memo = Memoize.create(
      (value: number) => {
        calls += 1;
        return value * 2;
      },
      memoizeOptions(scenarioCase.input.memoize, keyFnMap['number-string'])
    );

    assert.deepEqual([await memo.call(21), await memo.call(21)], scenarioCase.expected.results);
    assert.equal(calls, scenarioCase.expected.calls);
  },
  'throwing-coalesced-hook': async (scenarioCase) => {
    const pending = createPendingValue<string>();

    class ThrowingCoalescedMemoize extends Memoize<[string], string> {
      protected override onMemoCoalesced(): void {
        throw new Error('onMemoCoalesced boom');
      }
    }

    const memo = ThrowingCoalescedMemoize.create(
      async (id: string) => `${id}:${await pending.promise}`,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    const calls = createSameKeyCalls(memo, 'x', readBatchCallCount(scenarioCase));
    pending.resolve('shared');

    assert.deepEqual(
      [...await Promise.all(calls), await memo.call('x')],
      readStringArray(scenarioCase.expected.results, 'Scenario expected.results')
    );
  },
  'throwing-hit-hook': async (scenarioCase) => {
    class ThrowingHitMemoize extends Memoize<[string], string> {
      protected override onMemoHit(): void {
        throw new Error('onMemoHit boom');
      }
    }

    const memo = ThrowingHitMemoize.create(
      (id: string) => `value:${id}`,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    await memo.call('a');
    assert.equal(await memo.call('a'), scenarioCase.expected.value);
  },
  'throwing-miss-hook': async (scenarioCase) => {
    class ThrowingMissMemoize extends Memoize<[string], string> {
      protected override onMemoMiss(): void {
        throw new Error('onMemoMiss boom');
      }
    }

    const memo = ThrowingMissMemoize.create(
      (id: string) => `value:${id}`,
      memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
    );

    assert.equal(await memo.call('a'), scenarioCase.expected.first);
    assert.equal(await memo.call('a'), scenarioCase.expected.second);
  },
  'ttl-stale-options': async (scenarioCase) => {
    const ttlMs = readNumber(scenarioCase.input.memoize.ttlMs, 'Scenario input.memoize.ttlMs');
    let calls = 0;
    const originalNow = Date.now;
    let currentMs = 0;

    try {
      Date.now = (): number => currentMs;

      const memo = Memoize.create(
        (id: string) => {
          calls += 1;
          return `value:${id}:${calls}`;
        },
        memoizeOptions(scenarioCase.input.memoize, keyFnMap.identity)
      );

      assert.equal(await memo.call('a'), scenarioCase.expected.first);
      assert.equal(await memo.call('a'), scenarioCase.expected.second);
      assert.equal(calls, scenarioCase.expected.calls);

      // Advance the mocked clock past the configured ttlMs. This proves ttlMs
      // actually reached the underlying LruCache: an entry that never received
      // the option would keep replaying the first computed value forever.
      currentMs += ttlMs + 1;
      assert.equal(await memo.call('a'), scenarioCase.expected.afterExpiry);
      assert.equal(calls, scenarioCase.expected.callsAfterExpiry);
    } finally {
      Date.now = originalNow;
    }
  },
  'undefined-result-cache': async (scenarioCase) => {
    let calls = 0;
    const key = readString(scenarioCase.input.key, 'Scenario input.key');
    const memo = Memoize.create(
      (_key: string) => {
        calls += 1;
        return undefined;
      },
      memoizeOptions<[string]>(scenarioCase.input.memoize, keyFnMap.identity)
    );

    const first = await memo.call(key);
    const second = await memo.call(key);
    assert.equal(typeof first, scenarioCase.expected.resultType);
    assert.equal(typeof second, scenarioCase.expected.resultType);
    assert.equal(calls, scenarioCase.expected.calls);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Memoize', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.description, async () => {
      await runCase(scenarioCase);
    });
  }
});
