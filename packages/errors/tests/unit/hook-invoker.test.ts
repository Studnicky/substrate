/**
 * HookInvoker Unit Tests
 */

import {
  deepStrictEqual,
  notStrictEqual,
  ok,
  rejects,
  strictEqual,
  throws
} from 'node:assert/strict';
import {
  describe,
  it
} from 'node:test';

import { HookInvocationError } from '../../src/errors/HookInvocationError.js';
import { HookInvoker } from '../../src/errors/HookInvoker.js';
import { HookTimeoutError } from '../../src/errors/HookTimeoutError.js';
import { ReentrantHookInvocationError } from '../../src/errors/ReentrantHookInvocationError.js';
import { ValidationError } from '../../src/errors/ValidationError.js';

class SwallowingInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {}
}

class RecordingInvoker extends HookInvoker {
  readonly causes: unknown[] = [];
  readonly erroredHookNames: string[] = [];

  protected override onHookError(hookName: string, cause: unknown): void {
    this.causes.push(cause);
    this.erroredHookNames.push(hookName);
  }
}

class AsyncRejectingOnHookErrorInvoker extends HookInvoker {
  readonly terminalCause = new Error('onHookError itself failed');

  protected override async onHookError(_hookName: string, _cause: unknown): Promise<void> {
    await Promise.resolve();
    throw this.terminalCause;
  }
}

class AsyncSwallowingInvoker extends HookInvoker {
  readonly erroredHookNames: string[] = [];

  protected override async onHookError(hookName: string, _cause: unknown): Promise<void> {
    await Promise.resolve();
    this.erroredHookNames.push(hookName);
  }
}

let callCount = 0;
class LoopingOnHookErrorInvoker extends HookInvoker {
  protected override async onHookError(_hookName: string, _cause: unknown): Promise<void> {
    callCount += 1;
    await Promise.resolve();
    throw new Error('onHookError rejects every time');
  }
}

void describe('HookInvoker', () => {
  void describe('diagnostics', () => {
    void it('snapshots one synchronous diagnostic before original and returned graphs mutate', () => {
      const invoker = new SwallowingInvoker();
      const originalDetails: { 'labels': string[]; 'self'?: unknown } = { 'labels': ['initial'] };
      originalDetails.self = originalDetails;
      const original = new Error('hook failed', { 'cause': originalDetails });
      Reflect.set(original, 'details', originalDetails);

      invoker.invoke('onExample', () => {
        throw original;
      });

      original.message = 'mutated original error';
      originalDetails.labels.push('mutated original details');
      original.cause = { 'labels': ['replacement cause'] };
      Reflect.set(original, 'details', { 'labels': ['replacement details'] });

      const first = invoker.getHookErrors();
      const second = invoker.getHookErrors();
      const firstDiagnostic = first[0];
      const secondDiagnostic = second[0];

      strictEqual(invoker.hookErrorCount, 1);
      strictEqual(first.length, 1);
      strictEqual(second.length, 1);
      ok(firstDiagnostic instanceof HookInvocationError);
      ok(secondDiagnostic instanceof HookInvocationError);
      notStrictEqual(firstDiagnostic, secondDiagnostic);
      notStrictEqual(firstDiagnostic.cause, original);
      notStrictEqual(secondDiagnostic.cause, original);
      notStrictEqual(firstDiagnostic.cause, secondDiagnostic.cause);
      ok(firstDiagnostic.cause instanceof Error);
      ok(secondDiagnostic.cause instanceof Error);
      strictEqual(firstDiagnostic.cause.message, 'hook failed');
      strictEqual(secondDiagnostic.cause.message, 'hook failed');

      firstDiagnostic.name = 'MutatedDiagnostic';
      firstDiagnostic.cause.message = 'mutated error';
      const firstDetails = firstDiagnostic.cause.cause;
      ok(firstDetails !== null && typeof firstDetails === 'object');
      const firstLabels: unknown = Reflect.get(firstDetails, 'labels');
      ok(Array.isArray(firstLabels));
      firstLabels.push('mutated returned details');
      strictEqual(Reflect.get(firstDetails, 'self'), firstDetails);
      strictEqual(Reflect.get(firstDiagnostic.cause, 'details'), firstDetails);

      strictEqual(secondDiagnostic.name, 'HookInvocationError');
      strictEqual(secondDiagnostic.cause.message, 'hook failed');
      const secondDetails = secondDiagnostic.cause.cause;
      ok(secondDetails !== null && typeof secondDetails === 'object');
      const secondLabels: unknown = Reflect.get(secondDetails, 'labels');
      deepStrictEqual(secondLabels, ['initial']);
      strictEqual(Reflect.get(secondDetails, 'self'), secondDetails);
      strictEqual(Reflect.get(secondDiagnostic.cause, 'details'), secondDetails);
      strictEqual(invoker.hookErrorCount, 1);
    });

    void it('snapshots one asynchronous diagnostic before original and returned graphs mutate', async () => {
      const invoker = new SwallowingInvoker();
      const originalDetails = { 'attempts': [1] };
      const original = new Error('async hook failed', { 'cause': originalDetails });
      Reflect.set(original, 'details', originalDetails);

      await invoker.invokeAsync('onAsyncExample', async () => {
        await Promise.resolve();
        throw original;
      });

      original.message = 'mutated async original';
      originalDetails.attempts.push(2);
      const firstDiagnostic = invoker.getHookErrors()[0];
      ok(firstDiagnostic instanceof HookInvocationError);
      ok(firstDiagnostic.cause instanceof Error);
      strictEqual(firstDiagnostic.hookName, 'onAsyncExample');
      strictEqual(firstDiagnostic.cause.message, 'async hook failed');
      const firstDetails = firstDiagnostic.cause.cause;
      ok(firstDetails !== null && typeof firstDetails === 'object');
      const firstAttempts: unknown = Reflect.get(firstDetails, 'attempts');
      deepStrictEqual(firstAttempts, [1]);
      ok(Array.isArray(firstAttempts));
      firstAttempts.push(3);

      const secondDiagnostic = invoker.getHookErrors()[0];
      ok(secondDiagnostic instanceof HookInvocationError);
      ok(secondDiagnostic.cause instanceof Error);
      notStrictEqual(firstDiagnostic, secondDiagnostic);
      notStrictEqual(firstDiagnostic.cause, secondDiagnostic.cause);
      const secondDetails = secondDiagnostic.cause.cause;
      ok(secondDetails !== null && typeof secondDetails === 'object');
      deepStrictEqual(Reflect.get(secondDetails, 'attempts'), [1]);
      strictEqual(invoker.hookErrorCount, 1);
    });
  });

  void describe('invoke', () => {
    void it('executes a synchronous hook immediately and discards its returned value', () => {
      const invoker = new HookInvoker();
      let hookRan = false;

      const completion: void = invoker.invoke('sync-success', () => {
        hookRan = true;
        return 'discarded';
      });

      strictEqual(hookRan, true);
      strictEqual(completion, undefined);
    });

    void it('returns undefined for an asynchronous callback and guards its completion internally', async () => {
      const invoker = new HookInvoker();
      let hookCompleted = false;
      const hookFinished = Promise.withResolvers<void>();

      const completion: void = invoker.invoke('async-success', async () => {
        await Promise.resolve();
        hookCompleted = true;
        hookFinished.resolve();
        return 'discarded';
      });

      strictEqual(completion, undefined);
      strictEqual(hookCompleted, false);
      await hookFinished.promise;
      strictEqual(hookCompleted, true);
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

    void it('returns undefined and routes an asynchronous rejection with its exact cause', async () => {
      const invoker = new RecordingInvoker();
      const original = new Error('async boom');

      const completion: void = invoker.invoke('async-reject', async () => {
        throw original;
      });

      strictEqual(completion, undefined);
      await new Promise((resolve) => { setImmediate(resolve); });
      deepStrictEqual(invoker.erroredHookNames, ['async-reject']);
      deepStrictEqual(invoker.causes, [original]);
    });

    void it('completes synchronously when onHookError swallows a synchronous failure', () => {
      const invoker = new SwallowingInvoker();

      const completion = invoker.invoke('swallowed', () => {
        throw new Error('should be swallowed');
      });

      strictEqual(completion, undefined);
    });

    void it('returns undefined while onHookError asynchronously swallows a failure', async () => {
      const invoker = new AsyncSwallowingInvoker();

      const completion: void = invoker.invoke('async-swallowed', async () => {
        await Promise.resolve();
        throw new Error('should be swallowed');
      });

      strictEqual(completion, undefined);
      await new Promise((resolve) => { setImmediate(resolve); });
      deepStrictEqual(invoker.erroredHookNames, ['async-swallowed']);
    });

    void it('routes a rejection from an unexpectedly-async hook to onHookError without ever producing an unhandled rejection, even when the calling site never awaits the result', async () => {
      const invoker = new RecordingInvoker();
      const rejectionEvents: unknown[] = [];
      const unexpectedlyAsyncHook: () => void = async () => {
        throw new Error('should not crash the process');
      };
      const onUnhandledRejection = (reason: unknown): void => {
        rejectionEvents.push(reason);
      };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const completion: void = invoker.invoke('onUnexpectedAsync', unexpectedlyAsyncHook);

        strictEqual(completion, undefined);
        await new Promise((resolve) => { setImmediate(resolve); });
        await new Promise((resolve) => { setImmediate(resolve); });

        strictEqual(rejectionEvents.length, 0);
        deepStrictEqual(invoker.erroredHookNames, ['onUnexpectedAsync']);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });
  });

  void describe('invokeAsync', () => {
    void it('executes a synchronous hook immediately and resolves its completion promise', async () => {
      const invoker = new HookInvoker();
      let hookRan = false;

      const completion: Promise<void> = invoker.invokeAsync('sync-success', () => {
        hookRan = true;
        return 'discarded';
      });

      strictEqual(hookRan, true);
      strictEqual(await completion, undefined);
    });

    void it('waits for a statically asynchronous hook to complete', async () => {
      const invoker = new HookInvoker();
      let hookCompleted = false;

      const completion = invoker.invokeAsync('async-success', async () => {
        await Promise.resolve();
        hookCompleted = true;
      });

      strictEqual(hookCompleted, false);
      await completion;
      strictEqual(hookCompleted, true);
    });

    void it('rejects with HookInvocationError when a hook throws synchronously', async () => {
      const invoker = new HookInvoker();
      const original = new Error('sync boom');

      await rejects(
        invoker.invokeAsync('sync-throw', () => { throw original; }),
        (err: unknown) => {
          ok(err instanceof HookInvocationError);
          strictEqual(err.hookName, 'sync-throw');
          strictEqual(err.cause, original);
          return true;
        }
      );
    });

    void it('rejects with HookInvocationError when a hook rejects asynchronously', async () => {
      const invoker = new HookInvoker();
      const original = new Error('async boom');

      await rejects(
        invoker.invokeAsync('async-reject', async () => { throw original; }),
        (err: unknown) => {
          ok(err instanceof HookInvocationError);
          strictEqual(err.hookName, 'async-reject');
          strictEqual(err.cause, original);
          return true;
        }
      );
    });

    void it('routes a timeout through the same HookInvocationError contract', async () => {
      const invoker = new HookInvoker({ 'timeoutMs': 10 });

      await rejects(
        invoker.invokeAsync('neverSettles', () => new Promise(() => { /* never resolves or rejects */ })),
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

    void it('waits for a runtime thenable returned by a hook statically typed as void', async () => {
      const invoker = new HookInvoker();
      const events: string[] = [];
      const unexpectedlyAsyncHook: () => void = async () => {
        events.push('started');
        await Promise.resolve();
        events.push('completed');
      };

      const completion: Promise<void> = invoker.invokeAsync('unexpectedly-async', unexpectedlyAsyncHook);

      deepStrictEqual(events, ['started']);
      await completion;
      deepStrictEqual(events, ['started', 'completed']);
    });
  });

  void describe('onHookError guarding', () => {
    void it('propagates a synchronous throw from onHookError directly (matches the default disposition)', () => {
      class ThrowingOnHookErrorInvoker extends HookInvoker {
        protected override onHookError(hookName: string, cause: unknown): void {
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

    void it('invoke internally observes an async-rejecting onHookError result without producing an unhandled rejection', async () => {
      const invoker = new AsyncRejectingOnHookErrorInvoker();
      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => {
        rejectionEvents.push(reason);
      };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const completion: void = invoker.invoke('onFailingHook', () => {
          throw new Error('original hook failure');
        });

        strictEqual(completion, undefined);
        await new Promise((resolve) => { setImmediate(resolve); });
        strictEqual(rejectionEvents.length, 0);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });

    void it('invokeAsync propagates an async-rejecting onHookError result as its terminal failure', async () => {
      const invoker = new AsyncRejectingOnHookErrorInvoker();

      await rejects(
        invoker.invokeAsync('onFailingHook', async () => {
          await Promise.resolve();
          throw new Error('original hook failure');
        }),
        (error: unknown) => {
          strictEqual(error, invoker.terminalCause);
          return true;
        }
      );
    });

    void it('does not loop forever when onHookError is deterministically broken — its own failure is terminal', async () => {
      callCount = 0;
      const invoker = new LoopingOnHookErrorInvoker();

      const completion: void = invoker.invoke('onFailingHook', () => {
        throw new Error('original hook failure');
      });

      strictEqual(completion, undefined);
      await new Promise((resolve) => { setImmediate(resolve); });

      // onHookError is called exactly once for the original failure, and its
      // own rejection is NOT fed back into onHookError again.
      strictEqual(callCount, 1);
    });
  });

  void describe('options validation', () => {
    void it('accepts no options', () => {
      const invoker = new HookInvoker();
      let hookRan = false;

      const completion = invoker.invoke('ok', () => { hookRan = true; });

      strictEqual(hookRan, true);
      strictEqual(completion, undefined);
    });

    void it('throws ValidationError for a malformed options object', () => {
      const malformed = { 'timeoutMs': 'not-a-number' };
      try {
        Reflect.construct(HookInvoker, [malformed]);
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
      let callCount = 0;

      invoker.invoke('first', () => { callCount += 1; });
      invoker.invoke('second', () => { callCount += 1; });

      strictEqual(callCount, 2);
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
      strictEqual(caughtInsideOuter.hookName, 'inner');
    });

    void it('does not flag reentrancy when disabled (the default) for the same reentrant pattern', () => {
      const invoker = new HookInvoker();
      let innerRan = false;
      let outerRan = false;

      invoker.invoke('outer', () => {
        invoker.invoke('inner', () => { innerRan = true; });
        outerRan = true;
      });

      strictEqual(outerRan, true);
      strictEqual(innerRan, true);
    });

    void it('clears the reentrancy guard after a throwing hook, so a later independent call still succeeds', () => {
      const invoker = new HookInvoker({ 'detectReentrancy': true });

      throws(
        () => { invoker.invoke('willThrow', () => { throw new Error('boom'); }); },
        HookInvocationError
      );

      let afterwardRan = false;
      invoker.invoke('afterward', () => { afterwardRan = true; });
      strictEqual(afterwardRan, true);
    });
  });

  void describe('timeoutMs', () => {
    void it('invokeAsync resolves normally when the hook settles before the timeout', async () => {
      const invoker = new HookInvoker({ 'timeoutMs': 50 });
      let hookCompleted = false;

      const completion = invoker.invokeAsync('fast', async () => {
        await new Promise((resolve) => { setTimeout(resolve, 1); });
        hookCompleted = true;
        return 'discarded';
      });

      strictEqual(await completion, undefined);
      strictEqual(hookCompleted, true);
    });

    void it('invoke returns undefined while routing a fire-and-forget timeout without an unhandled rejection', async () => {
      const invoker = new RecordingInvoker({ 'timeoutMs': 10 });
      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const completion: void = invoker.invoke(
          'neverSettles',
          () => new Promise(() => { /* never resolves or rejects */ })
        );

        strictEqual(completion, undefined);
        await new Promise((resolve) => { setTimeout(resolve, 20); });
        deepStrictEqual(invoker.erroredHookNames, ['neverSettles']);
        const cause = invoker.causes[0];
        ok(cause instanceof HookTimeoutError);
        strictEqual(cause.hookName, 'neverSettles');
        strictEqual(cause.timeoutMs, 10);
        strictEqual(rejectionEvents.length, 0);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });

    void it('does not leave a dangling timer once the hook settles before the timeout (no unhandled rejection later)', async () => {
      const invoker = new HookInvoker({ 'timeoutMs': 1000 });
      const rejectionEvents: unknown[] = [];
      const onUnhandledRejection = (reason: unknown): void => { rejectionEvents.push(reason); };
      process.on('unhandledRejection', onUnhandledRejection);

      try {
        const completion = invoker.invokeAsync('quick', async () => 'discarded');
        strictEqual(await completion, undefined);
        await new Promise((resolve) => { setTimeout(resolve, 5); });
        strictEqual(rejectionEvents.length, 0);
      } finally {
        process.off('unhandledRejection', onUnhandledRejection);
      }
    });

    void it('never applies a timeout to a genuinely synchronous hook result', () => {
      const invoker = new HookInvoker({ 'timeoutMs': 1 });
      let hookRan = false;

      const completion = invoker.invoke('sync', () => {
        hookRan = true;
        return 'discarded';
      });

      strictEqual(hookRan, true);
      strictEqual(completion, undefined);
    });
  });
});
