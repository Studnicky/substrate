/**
 * HookInvoker Unit Tests
 */

import {
  deepStrictEqual,
  ok,
  rejects,
  strictEqual
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { HookInvocationError } from '../../src/errors/HookInvocationError.js';
import { HookInvoker } from '../../src/errors/HookInvoker.js';
import type { HookInvokerOptionsType } from '../../src/errors/HookInvoker.js';
import { HookTimeoutError } from '../../src/errors/HookTimeoutError.js';
import { ReentrantHookInvocationError } from '../../src/errors/ReentrantHookInvocationError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';

const SENTINEL_VALUE = 'sentinel-fallback';

class SwallowingInvoker extends HookInvoker {
  protected override onHookError<T>(_hookName: string, _cause: unknown): T {
    return SENTINEL_VALUE as T;
  }
}

class RecordingInvoker extends HookInvoker {
  erroredHookNames: string[] = [];

  protected override onHookError<T>(hookName: string, _cause: unknown): T {
    this.erroredHookNames.push(hookName);
    return undefined as T;
  }
}

class AsyncRejectingOnHookErrorInvoker extends HookInvoker {
  protected override async onHookError<T>(hookName: string, cause: unknown): Promise<T> {
    await Promise.resolve();
    throw new Error(`onHookError itself failed for ${hookName}: ${String(cause)}`);
  }
}

let callCount = 0;
class LoopingOnHookErrorInvoker extends HookInvoker {
  protected override async onHookError<T>(_hookName: string, _cause: unknown): Promise<T> {
    callCount += 1;
    await Promise.resolve();
    throw new Error('onHookError rejects every time');
  }
}

void describe('HookInvoker', () => {
  void describe('invoke', () => {
    void it('resolves with the value returned by a synchronously succeeding hook', () => {
      const invoker = new HookInvoker();
      const result = invoker.invoke('sync-success', () => 'ok');
      strictEqual(result, 'ok');
    });

    void it('never wraps a synchronous result in a Promise', () => {
      const invoker = new HookInvoker();
      const result = invoker.invoke('sync-success', () => 42);
      ok(!(result instanceof Promise));
    });

    void it('resolves with the value returned by a hook that resolves via a promise', async () => {
      const invoker = new HookInvoker();
      const result = await invoker.invoke('async-success', () => Promise.resolve('ok'));
      strictEqual(result, 'ok');
    });

    void it('rejects with a HookInvocationError when the hook throws synchronously', () => {
      const invoker = new HookInvoker();
      const original = new Error('sync boom');

      try {
        invoker.invoke('sync-throw', () => {
          throw original;
        });
        throw new Error('expected invoke to throw');
      } catch (err: unknown) {
        ok(err instanceof HookInvocationError);
        strictEqual(err.hookName, 'sync-throw');
        strictEqual(err.cause, original);
      }
    });

    void it('rejects with a HookInvocationError when the hook rejects asynchronously', async () => {
      const invoker = new HookInvoker();
      const original = new Error('async boom');

      await rejects(
        async () => invoker.invoke('async-reject', async () => {
          throw original;
        }),
        (err: unknown) => {
          ok(err instanceof HookInvocationError);
          strictEqual(err.hookName, 'async-reject');
          strictEqual(err.cause, original);
          return true;
        }
      );
    });

    void it('resolves with a sentinel value when onHookError is overridden to swallow the failure', () => {
      const invoker = new SwallowingInvoker();

      const result = invoker.invoke('swallowed', () => {
        throw new Error('should be swallowed');
      });

      strictEqual(result, SENTINEL_VALUE);
    });

    void it('exposes the pending promise so a caller who chooses to await it still observes the routed failure exactly once', async () => {
      const invoker = new HookInvoker();
      const original = new Error('async boom, observed by the caller');

      const pending = invoker.invoke('onAsyncObserved', async () => {
        throw original;
      });

      await rejects(
        async () => pending,
        (err: unknown) => {
          ok(err instanceof HookInvocationError);
          strictEqual(err.hookName, 'onAsyncObserved');
          strictEqual(err.cause, original);
          return true;
        }
      );
    });

    void it('routes a rejection from an unexpectedly-async hook to onHookError without ever producing an unhandled rejection, even when the calling site never awaits the result', async () => {
      const invoker = new RecordingInvoker();
      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => {
        rejectionEvents.push(reason);
      };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        invoker.invoke('onUnexpectedAsync', async () => {
          throw new Error('should not crash the process');
        });

        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });

        strictEqual(rejectionEvents.length, 0);
        deepStrictEqual(invoker.erroredHookNames, ['onUnexpectedAsync']);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });
  });

  void describe('onHookError guarding', () => {
    void it('propagates a synchronous throw from onHookError directly (matches the default disposition)', () => {
      class ThrowingOnHookErrorInvoker extends HookInvoker {
        protected override onHookError<T>(hookName: string, cause: unknown): T {
          throw new Error(`custom failure for ${hookName}: ${String(cause)}`);
        }
      }
      const invoker = new ThrowingOnHookErrorInvoker();

      try {
        invoker.invoke('sync-throw', () => {
          throw new Error('original');
        });
        throw new Error('expected invoke to throw');
      } catch (err: unknown) {
        ok(err instanceof Error);
        ok(err.message.includes('custom failure for sync-throw'));
        ok(!(err instanceof HookInvocationError));
      }
    });

    void it('routes an async-rejecting onHookError result the same way a hook result is routed, without producing an unhandled rejection', async () => {
      const invoker = new AsyncRejectingOnHookErrorInvoker();
      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => {
        rejectionEvents.push(reason);
      };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const pending = invoker.invoke('onFailingHook', () => {
          throw new Error('original hook failure');
        });

        await rejects(
          async () => pending,
          (err: unknown) => {
            ok(err instanceof Error);
            ok(err.message.includes('onHookError itself failed for onFailingHook'));
            return true;
          }
        );

        await new Promise((resolve) => { setImmediate(resolve); });
        strictEqual(rejectionEvents.length, 0);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });

    void it('does not loop forever when onHookError is deterministically broken — its own failure is terminal', async () => {
      callCount = 0;
      const invoker = new LoopingOnHookErrorInvoker();

      const pending = invoker.invoke('onFailingHook', () => {
        throw new Error('original hook failure');
      });

      await rejects(async () => pending, () => true);

      // onHookError is called exactly once for the original failure, and its
      // own rejection is NOT fed back into onHookError again.
      strictEqual(callCount, 1);
    });
  });

  void describe('options validation', () => {
    void it('accepts no options', () => {
      const invoker = new HookInvoker();
      strictEqual(invoker.invoke('ok', () => 1), 1);
    });

    void it('throws ValidationError for a malformed options object', () => {
      const malformed = { 'timeoutMs': 'not-a-number' } as unknown as HookInvokerOptionsType;
      try {
        new HookInvoker(malformed);
        throw new Error('expected constructor to throw');
      } catch (err: unknown) {
        ok(err instanceof ValidationError);
      }
    });

    void it('throws ValidationError for a non-positive timeoutMs', () => {
      try {
        new HookInvoker({ 'timeoutMs': 0 });
        throw new Error('expected constructor to throw');
      } catch (err: unknown) {
        ok(err instanceof ValidationError);
      }
    });
  });

  void describe('detectReentrancy', () => {
    void it('does not throw for non-reentrant calls when enabled', () => {
      const invoker = new HookInvoker({ 'detectReentrancy': true });
      const first = invoker.invoke('first', () => 1);
      const second = invoker.invoke('second', () => 2);
      strictEqual(first, 1);
      strictEqual(second, 2);
    });

    void it('throws ReentrantHookInvocationError (wrapped as the cause of the outer hook\'s own HookInvocationError, per the default onHookError disposition) when a hook synchronously calls back into invoke on the same instance', () => {
      const invoker = new HookInvoker({ 'detectReentrancy': true });

      try {
        invoker.invoke('outer', () => {
          invoker.invoke('inner', () => 'never reached');
        });
        throw new Error('expected invoke to throw');
      } catch (err: unknown) {
        // The reentrant throw happens inside `outer`'s own `fn()`, so it is
        // itself a synchronous failure of the `outer` hook — the default
        // onHookError wraps it exactly like any other cause, uniformly.
        ok(err instanceof HookInvocationError);
        strictEqual(err.hookName, 'outer');
        ok(err.cause instanceof ReentrantHookInvocationError);
        strictEqual(err.cause.hookName, 'inner');
      }
    });

    void it('propagates ReentrantHookInvocationError directly (unwrapped) when the reentrant call is not itself nested inside another invoke()\'s onHookError-wrapped fn()', () => {
      const invoker = new HookInvoker({ 'detectReentrancy': true });
      let caughtInsideOuter: unknown;

      invoker.invoke('outer', () => {
        try {
          invoker.invoke('inner', () => 'never reached');
        } catch (err: unknown) {
          caughtInsideOuter = err;
        }
      });

      ok(caughtInsideOuter instanceof ReentrantHookInvocationError);
      strictEqual((caughtInsideOuter as ReentrantHookInvocationError).hookName, 'inner');
    });

    void it('does not flag reentrancy when disabled (the default) for the same reentrant pattern', () => {
      const invoker = new HookInvoker();
      let innerRan = false;

      const result = invoker.invoke('outer', () => {
        invoker.invoke('inner', () => { innerRan = true; });
        return 'outer-result';
      });

      strictEqual(result, 'outer-result');
      strictEqual(innerRan, true);
    });

    void it('clears the reentrancy guard after a throwing hook, so a later independent call still succeeds', () => {
      const invoker = new HookInvoker({ 'detectReentrancy': true });

      try {
        invoker.invoke('willThrow', () => { throw new Error('boom'); });
      } catch {
        // expected — default onHookError rethrows as HookInvocationError
      }

      const result = invoker.invoke('afterward', () => 'ok');
      strictEqual(result, 'ok');
    });
  });

  void describe('timeoutMs', () => {
    void it('resolves normally when the hook settles before the timeout', async () => {
      const invoker = new HookInvoker({ 'timeoutMs': 50 });
      const result = await invoker.invoke('fast', async () => {
        await new Promise((resolve) => { setTimeout(resolve, 1); });
        return 'ok';
      });
      strictEqual(result, 'ok');
    });

    void it('routes a HookTimeoutError to onHookError (wrapped as the cause of a HookInvocationError, per the default disposition) when the hook never settles in time', async () => {
      const invoker = new HookInvoker({ 'timeoutMs': 10 });

      await rejects(
        async () => invoker.invoke('neverSettles', () => new Promise(() => { /* never resolves or rejects */ })),
        (err: unknown) => {
          ok(err instanceof HookInvocationError);
          strictEqual(err.hookName, 'neverSettles');
          ok(err.cause instanceof HookTimeoutError);
          strictEqual(err.cause.hookName, 'neverSettles');
          strictEqual(err.cause.timeoutMs, 10);
          return true;
        }
      );
    });

    void it('does not leave a dangling timer once the hook settles before the timeout (no unhandled rejection later)', async () => {
      const invoker = new HookInvoker({ 'timeoutMs': 1000 });
      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const result = await invoker.invoke('quick', async () => 'done');
        strictEqual(result, 'done');
        await new Promise((resolve) => { setTimeout(resolve, 5); });
        strictEqual(rejectionEvents.length, 0);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });

    void it('never applies a timeout to a genuinely synchronous hook result', () => {
      const invoker = new HookInvoker({ 'timeoutMs': 1 });
      const result = invoker.invoke('sync', () => 'immediate');
      strictEqual(result, 'immediate');
    });
  });
});
