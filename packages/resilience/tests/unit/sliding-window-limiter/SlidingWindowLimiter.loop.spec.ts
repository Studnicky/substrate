import { RuntimeError, HookInvocationError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';

import { SlidingWindowLimiterConfigError } from '../../../src/errors/SlidingWindowLimiterConfigError.js';
import { SlidingWindowExhaustedError } from '../../../src/SlidingWindowExhaustedError.js';
import { SlidingWindowLimiterOptionsEntity } from '../../../src/entities/SlidingWindowLimiterOptionsEntity.js';
import { SlidingWindowLimiter } from '../../../src/SlidingWindowLimiter.js';
import type { SlidingWindowLimiterOptionsInterface } from '../../../src/interfaces/SlidingWindowLimiterOptionsInterface.js';
import { SlidingWindowLimiterScenarioCaseEntity } from '../entities/SlidingWindowLimiterScenarioCaseEntity.js';
import scenarioGroups from './SlidingWindowLimiter.scenarios.json' with { type: 'json' };

type ScenarioCase = SlidingWindowLimiterScenarioCaseEntity.Type;
type LimiterInput = ScenarioCase['input']['slidingWindowLimiter'];
type LimiterAlgorithm = LimiterInput['algorithm'];
type ScenarioShape = ScenarioCase['shape'];
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

const fileIntake = ScenarioFileCompiler.compileIntake(SlidingWindowLimiterScenarioCaseEntity.Schema, SlidingWindowLimiterScenarioCaseEntity.Node);

/** Narrows an optional fixture field, throwing when a shape's fixture omits a field the runner requires. */
function requireField<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw RuntimeError.create(`Expected sliding-window-limiter fixture field: ${label}`);
  }
  return value;
}

function resolveLimiterConfig(input: LimiterInput, clock?: () => number): SlidingWindowLimiterOptionsInterface {
  const config: SlidingWindowLimiterOptionsInterface = {
    algorithm: input.algorithm,
    limit: input.limit,
    windowMs: input.windowMs
  };

  return clock === undefined ? config : { ...config, clock };
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'async-allow-rejection': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      class AsyncRejectingAllowLimiter extends SlidingWindowLimiter {
        static override create(options: SlidingWindowLimiterOptionsInterface): AsyncRejectingAllowLimiter {
          return new AsyncRejectingAllowLimiter(options);
        }
        get recordedHookErrors(): readonly HookInvocationError[] { return this.getHookErrors(); }
        protected override async onAllow(): Promise<void> {
          await Promise.resolve();
          throw RuntimeError.create('async onAllow boom');
        }
      }

      const limiter = AsyncRejectingAllowLimiter.create(resolveLimiterConfig(input));
      const rejectionEvents: Error[] = [];
      const onUnhandledRejection = (): void => { rejectionEvents.push(RuntimeError.create('unexpected unhandled rejection')); };
      process.on('unhandledRejection', onUnhandledRejection);

      return (async () => {
        try {
          limiter.consume();
          await new Promise((resolve) => { setImmediate(resolve); });
          await new Promise((resolve) => { setImmediate(resolve); });

          assert.strictEqual(rejectionEvents.length, 0);
          assert.strictEqual(limiter.recordedHookErrors.length, Number(expected.errorCount));
          assert.strictEqual(limiter.recordedHookErrors[0]?.hookName, Array.isArray(expected.hookNames) ? expected.hookNames[0] : undefined);
        } finally {
          process.off('unhandledRejection', onUnhandledRejection);
        }
      })();
  },
  'async-notification-order': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const hookNames = Array.isArray(expected.hookNames) ? expected.hookNames : [];
      class AsyncRejectingNotificationLimiter extends SlidingWindowLimiter {
        static override create(options: SlidingWindowLimiterOptionsInterface): AsyncRejectingNotificationLimiter {
          return new AsyncRejectingNotificationLimiter(options);
        }
        get recordedHookErrors(): readonly HookInvocationError[] { return this.getHookErrors(); }
        protected override async onAllow(): Promise<void> {
          await Promise.resolve();
          throw RuntimeError.create('async onAllow boom');
        }
        protected override async onReject(): Promise<void> {
          await Promise.resolve();
          throw RuntimeError.create('async onReject boom');
        }
        protected override async onWindowRoll(): Promise<void> {
          await Promise.resolve();
          throw RuntimeError.create('async onWindowRoll boom');
        }
      }

      let time = 0;
      const clock = (): number => time;
      const limiter = AsyncRejectingNotificationLimiter.create(resolveLimiterConfig(input, clock));
      const rejectionEvents: Error[] = [];
      const onUnhandledRejection = (): void => { rejectionEvents.push(RuntimeError.create('unexpected unhandled rejection')); };
      process.on('unhandledRejection', onUnhandledRejection);

      return (async () => {
        try {
          limiter.consume();
          time = input.windowMs + 1;
          limiter.consume();
          assert.throws(() => {
            limiter.consume();
          }, SlidingWindowExhaustedError);

          await new Promise((resolve) => { setImmediate(resolve); });
          await new Promise((resolve) => { setImmediate(resolve); });

          assert.strictEqual(rejectionEvents.length, 0);
          assert.strictEqual(limiter.recordedHookErrors.length, Number(expected.errorCount));
          assert.strictEqual(limiter.recordedHookErrors[0]?.hookName, hookNames[0]);
          assert.strictEqual(limiter.recordedHookErrors[1]?.hookName, hookNames[1]);
          assert.strictEqual(limiter.recordedHookErrors[2]?.hookName, hookNames[2]);
          assert.strictEqual(limiter.recordedHookErrors[3]?.hookName, hookNames[3]);
        } finally {
          process.off('unhandledRejection', onUnhandledRejection);
        }
      })();
  },
  'counter-blends-previous-window': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const firstAdvanceMs = requireField(input.firstAdvanceMs, 'firstAdvanceMs');
      const secondWaveAttempts = requireField(input.secondWaveAttempts, 'secondWaveAttempts');
      let time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      for (let index = 0; index < input.limit; index += 1) {
        limiter.consume();
      }
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      time = firstAdvanceMs;
      for (let index = 0; index < secondWaveAttempts; index += 1) {
        limiter.consume();
      }
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      assert.strictEqual(Number(expected.beforePruneRejects), 1);
      assert.strictEqual(Number(expected.afterPruneRejects), 1);
  },
  'default-clock-consume': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input));
      limiter.consume();
      assert.strictEqual(Number(expected.admitted), 1);
  },
  'default-clock-consume-counter': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input));
      limiter.consume();
      assert.strictEqual(Number(expected.admitted), 1);
  },
  'hook-error-isolation': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      class ThrowingAllowLimiter extends SlidingWindowLimiter {
        static override create(options: SlidingWindowLimiterOptionsInterface): ThrowingAllowLimiter {
          return new ThrowingAllowLimiter(options);
        }
        readonly failure = RuntimeError.create('onAllow boom', { 'cause': { 'windows': [1] } });
        get recordedHookErrorCount(): number { return this.hookErrorCount; }
        get recordedHookErrors(): readonly HookInvocationError[] { return this.getHookErrors(); }
        protected override onAllow(): void { throw this.failure; }
      }

      const first = ThrowingAllowLimiter.create(resolveLimiterConfig(input));
      const second = ThrowingAllowLimiter.create(resolveLimiterConfig(input));

      first.consume();
      const firstSnapshot = first.recordedHookErrors;

      assert.strictEqual(first.recordedHookErrorCount, Number(expected.firstCount));
      assert.strictEqual(second.recordedHookErrorCount, 0);
      assert.ok(firstSnapshot[0]?.cause instanceof Error);
      assert.strictEqual(firstSnapshot[0].cause.message, first.failure.message);

      second.consume();

      assert.strictEqual(first.recordedHookErrorCount, Number(expected.firstCount));
      assert.strictEqual(second.recordedHookErrorCount, Number(expected.secondCount));
      assert.strictEqual(firstSnapshot.length, Number(expected.snapshotLength));
      assert.ok(second.recordedHookErrors[0]?.cause instanceof Error);
      assert.strictEqual(second.recordedHookErrors[0].cause.message, second.failure.message);
  },
  'hook-error-snapshot': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      class ThrowingAllowLimiter extends SlidingWindowLimiter {
        static override create(options: SlidingWindowLimiterOptionsInterface): ThrowingAllowLimiter {
          return new ThrowingAllowLimiter(options);
        }
        readonly failure = RuntimeError.create('onAllow boom', { 'cause': { 'windows': [1] } });
        get recordedHookErrorCount(): number { return this.hookErrorCount; }
        get recordedHookErrors(): readonly HookInvocationError[] { return this.getHookErrors(); }
        protected override onAllow(): void { throw this.failure; }
      }

      const limiter = ThrowingAllowLimiter.create(resolveLimiterConfig(input));
      limiter.consume();

      assert.strictEqual(limiter.recordedHookErrorCount, Number(expected.firstCount));
      const firstCause = limiter.recordedHookErrors[0]?.cause;
      assert.ok(firstCause instanceof Error);
      firstCause.message = 'mutated';
      const firstDetails = firstCause.cause;
      assert.ok(firstDetails !== null && typeof firstDetails === 'object');
      const firstWindows = Reflect.get(firstDetails, 'windows');
      assert.ok(Array.isArray(firstWindows));
      firstWindows.push(2);

      const secondCause = limiter.recordedHookErrors[0]?.cause;
      assert.ok(secondCause instanceof Error);
      assert.strictEqual(secondCause.message, 'onAllow boom');
      assert.strictEqual(limiter.recordedHookErrorCount, Number(expected.firstCount));
      const secondDetails = secondCause.cause;
      assert.ok(secondDetails !== null && typeof secondDetails === 'object');
      const secondWindows = Reflect.get(secondDetails, 'windows');
      assert.ok(Array.isArray(secondWindows));
      assert.strictEqual(secondWindows.length, Number(expected.snapshotLength));
      assert.strictEqual(secondWindows[0], 1);
  },
  'hook-event': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const hook = requireField(input.hook, 'hook');
      const time = 0;
      const clock = (): number => time;
      const limiter = new class extends SlidingWindowLimiter {
        readonly events: Array<{ type: string; value?: number }> = [];
        constructor(options: SlidingWindowLimiterOptionsInterface) { super(options); }
        protected override onAllow(count: number): void { this.events.push({ type: 'allow', value: count }); }
        protected override onReject(count: number): void { this.events.push({ type: 'reject', value: count }); }
        protected override onWindowRoll(): void { this.events.push({ type: 'windowRoll' }); }
      }(resolveLimiterConfig(input, clock));

      const hookRunner = {
        allow: (): void => {
          limiter.consume();
        },
        reject: (): void => {
          limiter.consume();
          assert.throws(() => {
            limiter.consume();
          }, SlidingWindowExhaustedError);
        }
      } satisfies Record<typeof hook, () => void>;

      hookRunner[hook]();

      assert.deepStrictEqual(limiter.events, expected.events);
  },
  'invalid-config': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      assert.throws(() => {
        SlidingWindowLimiter.create(resolveLimiterConfig(input));
      }, SlidingWindowLimiterConfigError);
      assert.strictEqual(expected.errorName, SlidingWindowLimiterConfigError.name);
  },
  'limit-plus-one-throws': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const admitCount = requireField(input.admitCount, 'admitCount');
      const time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      for (let index = 0; index < admitCount; index += 1) {
        limiter.consume();
      }
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      assert.strictEqual(Number(expected.admitted), admitCount);
  },
  'log-prunes-stale-entries': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const firstAdvanceMs = requireField(input.firstAdvanceMs, 'firstAdvanceMs');
      const secondAdvanceMs = requireField(input.secondAdvanceMs, 'secondAdvanceMs');
      let time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      limiter.consume();
      time = firstAdvanceMs;
      limiter.consume();
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      time = secondAdvanceMs;
      limiter.consume();
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      assert.strictEqual(Number(expected.beforePruneRejects), 1);
      assert.strictEqual(Number(expected.afterPruneRejects), 1);
  },
  'recovers-after-window': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const admitCount = requireField(input.admitCount, 'admitCount');
      const advanceAfterRejectMs = requireField(input.advanceAfterRejectMs, 'advanceAfterRejectMs');
      let time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      for (let index = 0; index < admitCount; index += 1) {
        limiter.consume();
      }
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      time = advanceAfterRejectMs;
      limiter.consume();
      assert.strictEqual(Number(expected.admittedBeforeRetry), admitCount);
      assert.strictEqual(Number(expected.retryAfterMs), advanceAfterRejectMs);
  },
  'structural-compatibility': async (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const consumeTokens = requireField(input.consumeTokens, 'consumeTokens');
      const waitTokens = requireField(input.waitTokens, 'waitTokens');
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input));
      limiter.consume(consumeTokens);
      await limiter.waitForToken({ tokens: waitTokens });
      assert.strictEqual(expected.output, 'resolved');
  },
  'wait-for-token-aborts': async (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const abortMessage = requireField(input.abortMessage, 'abortMessage');
      const time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      limiter.consume();
      const controller = new AbortController();
      setImmediate(() => {
        controller.abort(RuntimeError.create(abortMessage));
      });
      await assert.rejects(() => limiter.waitForToken({ signal: controller.signal }), { 'message': abortMessage });
      assert.strictEqual(expected.rejectionMessage, abortMessage);
  },
  'within-limit': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const admitCount = requireField(input.admitCount, 'admitCount');
      const time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      for (let index = 0; index < admitCount; index += 1) {
        limiter.consume();
      }
      assert.strictEqual(Number(expected.admitted), admitCount);
  },
  'window-roll': (scenarioCase) => {
      const input = scenarioCase.input.slidingWindowLimiter;
      const expected = scenarioCase.expected;
      const rollAfterMs = requireField(input.rollAfterMs, 'rollAfterMs');
      let time = 0;
      const clock = (): number => time;
      const limiter = new class extends SlidingWindowLimiter {
        readonly events: Array<{ type: string }> = [];
        constructor(options: SlidingWindowLimiterOptionsInterface) { super(options); }
        protected override onWindowRoll(): void { this.events.push({ type: 'windowRoll' }); }
      }(resolveLimiterConfig(input, clock));

      const windowRollRunner = {
        counter: (): void => {
          limiter.consume();
          limiter.consume();
          time = rollAfterMs;
          limiter.consume();
        },
        log: (): void => {
          limiter.consume();
          time = rollAfterMs;
          limiter.consume();
        }
      } satisfies Record<LimiterAlgorithm, () => void>;

      windowRollRunner[input.algorithm]();
      assert.deepStrictEqual(limiter.events.map((event) => event.type), expected.events);
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('SlidingWindowLimiter', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});


void describe('SlidingWindowLimiter unknown-property boundary', () => {
  void it('rejects an unrecognized configuration property instead of discarding it', () => {
    const serializableOptions = {
      'algorithm': 'log',
      'limit': 1,
      'windowMs': 1_000
    } satisfies SlidingWindowLimiterOptionsInterface;
    const configuration = Object.assign(serializableOptions, { 'unrecognizedOption': true });

    assert.equal(SlidingWindowLimiterOptionsEntity.validate(configuration), false);
    assert.throws(() => { SlidingWindowLimiter.create(configuration); }, SlidingWindowLimiterConfigError);
  });
});
