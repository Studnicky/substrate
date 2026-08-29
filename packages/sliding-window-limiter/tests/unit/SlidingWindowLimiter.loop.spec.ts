import { RuntimeError, HookInvocationError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';



import { SlidingWindowLimiterConfigError } from '../../src/errors/SlidingWindowLimiterConfigError.js';
import { SlidingWindowExhaustedError } from '../../src/SlidingWindowExhaustedError.js';
import { SlidingWindowLimiter } from '../../src/SlidingWindowLimiter.js';
import type { SlidingWindowLimiterOptionsInterface } from '../../src/interfaces/SlidingWindowLimiterOptionsInterface.js';
import scenarioGroups from './SlidingWindowLimiter.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'async-allow-rejection'
  | 'async-notification-order'
  | 'counter-blends-previous-window'
  | 'default-clock-consume'
  | 'default-clock-consume-counter'
  | 'hook-error-isolation'
  | 'hook-error-snapshot'
  | 'hook-event'
  | 'invalid-config'
  | 'limit-plus-one-throws'
  | 'log-prunes-stale-entries'
  | 'recovers-after-window'
  | 'structural-compatibility'
  | 'wait-for-token-aborts'
  | 'window-roll'
  | 'within-limit';

type ScenarioCase =
  {
    description: string;
    expected: Record<string, unknown>;
    input: ScenarioInput;
    shape: ScenarioShape;
    name: string;
  };

type LimiterAlgorithm = 'counter' | 'log';
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;
type LimiterConfigInput = {
  algorithm: LimiterAlgorithm;
  limit: number;
  windowMs: number;
};
type SlidingWindowLimiterInput = LimiterConfigInput & Record<string, unknown>;
type ScenarioInput = {
  slidingWindowLimiter: SlidingWindowLimiterInput;
} & Record<string, unknown>;

function slidingWindowLimiterInput<T extends SlidingWindowLimiterInput = SlidingWindowLimiterInput>(input: ScenarioInput): T {
  return input.slidingWindowLimiter as T;
}

function resolveLimiterConfig(input: SlidingWindowLimiterInput, clock?: () => number): SlidingWindowLimiterOptionsInterface {
  const config: SlidingWindowLimiterOptionsInterface = {
    algorithm: input.algorithm,
    limit: Number(input.limit),
    windowMs: Number(input.windowMs)
  };

  return clock === undefined ? config : { ...config, clock };
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'async-allow-rejection': (scenarioCase) => {
      const input = slidingWindowLimiterInput(scenarioCase.input);
      const expected = scenarioCase.expected as { errorCount: number; hookNames: Array<'onAllow'> };
      class AsyncRejectingAllowLimiter extends SlidingWindowLimiter {
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
          assert.strictEqual(limiter.recordedHookErrors.length, expected.errorCount);
          assert.strictEqual(limiter.recordedHookErrors[0]?.hookName, expected.hookNames[0]);
        } finally {
          process.off('unhandledRejection', onUnhandledRejection);
        }
      })();
  },
  'async-notification-order': (scenarioCase) => {
      const input = slidingWindowLimiterInput(scenarioCase.input);
      const expected = scenarioCase.expected as { errorCount: number; hookNames: Array<'onAllow' | 'onReject' | 'onWindowRoll'> };
      class AsyncRejectingNotificationLimiter extends SlidingWindowLimiter {
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
          assert.strictEqual(limiter.recordedHookErrors.length, expected.errorCount);
          assert.strictEqual(limiter.recordedHookErrors[0]?.hookName, expected.hookNames[0]);
          assert.strictEqual(limiter.recordedHookErrors[1]?.hookName, expected.hookNames[1]);
          assert.strictEqual(limiter.recordedHookErrors[2]?.hookName, expected.hookNames[2]);
          assert.strictEqual(limiter.recordedHookErrors[3]?.hookName, expected.hookNames[3]);
        } finally {
          process.off('unhandledRejection', onUnhandledRejection);
        }
      })();
  },
  'counter-blends-previous-window': (scenarioCase) => {
      const input = slidingWindowLimiterInput<SlidingWindowLimiterInput & { firstAdvanceMs: number; secondWaveAttempts: number }>(scenarioCase.input);
      const expected = scenarioCase.expected as { afterPruneRejects: number; beforePruneRejects: number };
      let time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      for (let index = 0; index < input.limit; index += 1) {
        limiter.consume();
      }
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      time = input.firstAdvanceMs;
      for (let index = 0; index < input.secondWaveAttempts; index += 1) {
        limiter.consume();
      }
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      assert.strictEqual(expected.beforePruneRejects, 1);
      assert.strictEqual(expected.afterPruneRejects, 1);
  },
  'default-clock-consume': (scenarioCase) => {
      const input = slidingWindowLimiterInput(scenarioCase.input);
      const expected = scenarioCase.expected as { admitted: number };
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input));
      limiter.consume();
      assert.strictEqual(expected.admitted, 1);
  },
  'default-clock-consume-counter': (scenarioCase) => {
      const input = slidingWindowLimiterInput(scenarioCase.input);
      const expected = scenarioCase.expected as { admitted: number };
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input));
      limiter.consume();
      assert.strictEqual(expected.admitted, 1);
  },
  'hook-error-isolation': (scenarioCase) => {
      const input = slidingWindowLimiterInput(scenarioCase.input);
      const expected = scenarioCase.expected as { firstCount: number; secondCount: number; snapshotLength: number };
      class ThrowingAllowLimiter extends SlidingWindowLimiter {
        readonly failure = RuntimeError.create('onAllow boom', { 'cause': { 'windows': [1] } });
        get recordedHookErrorCount(): number { return this.hookErrorCount; }
        get recordedHookErrors(): readonly HookInvocationError[] { return this.getHookErrors(); }
        protected override onAllow(): void { throw this.failure; }
      }

      const first = ThrowingAllowLimiter.create(resolveLimiterConfig(input));
      const second = ThrowingAllowLimiter.create(resolveLimiterConfig(input));

      first.consume();
      const firstSnapshot = first.recordedHookErrors;

      assert.strictEqual(first.recordedHookErrorCount, expected.firstCount);
      assert.strictEqual(second.recordedHookErrorCount, 0);
      assert.ok(firstSnapshot[0]?.cause instanceof Error);
      assert.strictEqual(firstSnapshot[0].cause.message, first.failure.message);

      second.consume();

      assert.strictEqual(first.recordedHookErrorCount, expected.firstCount);
      assert.strictEqual(second.recordedHookErrorCount, expected.secondCount);
      assert.strictEqual(firstSnapshot.length, expected.snapshotLength);
      assert.ok(second.recordedHookErrors[0]?.cause instanceof Error);
      assert.strictEqual(second.recordedHookErrors[0].cause.message, second.failure.message);
  },
  'hook-error-snapshot': (scenarioCase) => {
      const input = slidingWindowLimiterInput(scenarioCase.input);
      const expected = scenarioCase.expected as { firstCount: number; secondCount: number; snapshotLength: number };
      class ThrowingAllowLimiter extends SlidingWindowLimiter {
        readonly failure = RuntimeError.create('onAllow boom', { 'cause': { 'windows': [1] } });
        get recordedHookErrorCount(): number { return this.hookErrorCount; }
        get recordedHookErrors(): readonly HookInvocationError[] { return this.getHookErrors(); }
        protected override onAllow(): void { throw this.failure; }
      }

      const limiter = ThrowingAllowLimiter.create(resolveLimiterConfig(input));
      limiter.consume();

      assert.strictEqual(limiter.recordedHookErrorCount, expected.firstCount);
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
      assert.strictEqual(limiter.recordedHookErrorCount, expected.firstCount);
      const secondDetails = secondCause.cause;
      assert.ok(secondDetails !== null && typeof secondDetails === 'object');
      const secondWindows = Reflect.get(secondDetails, 'windows');
      assert.ok(Array.isArray(secondWindows));
      assert.strictEqual(secondWindows.length, expected.snapshotLength);
      assert.strictEqual(secondWindows[0], 1);
  },
  'hook-event': (scenarioCase) => {
      const input = slidingWindowLimiterInput<SlidingWindowLimiterInput & { hook: 'allow' | 'reject' }>(scenarioCase.input);
      const expected = scenarioCase.expected as { events: Array<{ type: 'allow' | 'reject'; value?: number }> };
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
      } satisfies Record<typeof input.hook, () => void>;

      hookRunner[input.hook]();

      assert.deepStrictEqual(limiter.events, expected.events);
  },
  'invalid-config': (scenarioCase) => {
      const input = slidingWindowLimiterInput(scenarioCase.input);
      const expected = scenarioCase.expected as { errorName: string };
      assert.throws(() => {
        SlidingWindowLimiter.create(resolveLimiterConfig(input));
      }, SlidingWindowLimiterConfigError);
      assert.strictEqual(expected.errorName, SlidingWindowLimiterConfigError.name);
  },
  'limit-plus-one-throws': (scenarioCase) => {
      const input = slidingWindowLimiterInput<SlidingWindowLimiterInput & { admitCount: number }>(scenarioCase.input);
      const expected = scenarioCase.expected as { admitted: number };
      const time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      for (let index = 0; index < input.admitCount; index += 1) {
        limiter.consume();
      }
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      assert.strictEqual(expected.admitted, input.admitCount);
  },
  'log-prunes-stale-entries': (scenarioCase) => {
      const input = slidingWindowLimiterInput<SlidingWindowLimiterInput & { firstAdvanceMs: number; secondAdvanceMs: number }>(scenarioCase.input);
      const expected = scenarioCase.expected as { afterPruneRejects: number; beforePruneRejects: number };
      let time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      limiter.consume();
      time = input.firstAdvanceMs;
      limiter.consume();
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      time = input.secondAdvanceMs;
      limiter.consume();
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      assert.strictEqual(expected.beforePruneRejects, 1);
      assert.strictEqual(expected.afterPruneRejects, 1);
  },
  'recovers-after-window': (scenarioCase) => {
      const input = slidingWindowLimiterInput<SlidingWindowLimiterInput & { admitCount: number; advanceAfterRejectMs: number }>(scenarioCase.input);
      const expected = scenarioCase.expected as { admittedBeforeRetry: number; retryAfterMs: number };
      let time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      for (let index = 0; index < input.admitCount; index += 1) {
        limiter.consume();
      }
      assert.throws(() => {
        limiter.consume();
      }, SlidingWindowExhaustedError);
      time = input.advanceAfterRejectMs;
      limiter.consume();
      assert.strictEqual(expected.admittedBeforeRetry, input.admitCount);
      assert.strictEqual(expected.retryAfterMs, input.advanceAfterRejectMs);
  },
  'structural-compatibility': async (scenarioCase) => {
      const input = slidingWindowLimiterInput<SlidingWindowLimiterInput & { consumeTokens: number; waitTokens: number }>(scenarioCase.input);
      const expected = scenarioCase.expected as { output: string };
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input));
      limiter.consume(input.consumeTokens);
      await limiter.waitForToken({ tokens: input.waitTokens });
      assert.strictEqual(expected.output, 'resolved');
  },
  'wait-for-token-aborts': async (scenarioCase) => {
      const input = slidingWindowLimiterInput<SlidingWindowLimiterInput & { abortMessage: string }>(scenarioCase.input);
      const expected = scenarioCase.expected as { rejectionMessage: string };
      const time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      limiter.consume();
      const controller = new AbortController();
      setImmediate(() => {
        controller.abort(RuntimeError.create(input.abortMessage));
      });
      await assert.rejects(() => limiter.waitForToken({ signal: controller.signal }), { 'message': input.abortMessage });
      assert.strictEqual(expected.rejectionMessage, input.abortMessage);
  },
  'within-limit': (scenarioCase) => {
      const input = slidingWindowLimiterInput<SlidingWindowLimiterInput & { admitCount: number }>(scenarioCase.input);
      const expected = scenarioCase.expected as { admitted: number };
      const time = 0;
      const clock = (): number => time;
      const limiter = SlidingWindowLimiter.create(resolveLimiterConfig(input, clock));
      for (let index = 0; index < input.admitCount; index += 1) {
        limiter.consume();
      }
      assert.strictEqual(expected.admitted, input.admitCount);
  },
  'window-roll': (scenarioCase) => {
      const input = slidingWindowLimiterInput<SlidingWindowLimiterInput & { rollAfterMs: number }>(scenarioCase.input);
      const expected = scenarioCase.expected as { events: Array<'windowRoll'> };
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
          time = input.rollAfterMs;
          limiter.consume();
        },
        log: (): void => {
          limiter.consume();
          time = input.rollAfterMs;
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
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
