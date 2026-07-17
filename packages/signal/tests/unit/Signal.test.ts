/**
 * Signal Unit Tests
 *
 * Tests AbortSignal composition:
 * - never() singleton sentinel
 * - compose() with various option combinations
 * - timeout() thin wrapper
 * - instance methods via Signal.create()
 * - onCompose observer hook via subclassing
 * - onHookError override swallowing a failing onCompose hook
 * - RaceTimeout.wait timer/signal racing
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import { RaceTimeout } from '../../src/RaceTimeout.js';
import { Signal } from '../../src/Signal.js';

type ComposeOptions = { 'deadlineMs'?: number; 'signal'?: AbortSignal };

class RecordingSignal extends Signal {
  public calls: Array<{ options: ComposeOptions; result: AbortSignal }> = [];

  protected override onCompose(options: ComposeOptions, result: AbortSignal): void {
    this.calls.push({ options, result });
  }
}

const neverScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'never aborts',
    exec: () => {
      const sig = Signal.never();
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig.aborted, false, 'Should not be aborted');
    },
  },
  {
    description: 'same cached instance',
    exec: () => {
      const first  = Signal.never();
      const second = Signal.never();
      assert.equal(first, second, 'Should return the same cached instance');
    },
  },
];

for (const { description, exec } of neverScenarios) {
  it(description, exec);
}

const composeSyncScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'empty options',
    exec: async () => {
      const sig = await Signal.compose({});
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig.aborted, false, 'Should not be aborted');
    },
  },
  {
    description: 'provided signal',
    exec: async () => {
      const controller = new AbortController();
      const sig = await Signal.compose({ signal: controller.signal });
      assert.equal(sig, controller.signal, 'Should return the exact provided signal');
    },
  },
  {
    description: 'signal+deadlineMs abort',
    exec: async () => {
      const controller = new AbortController();
      const sig = await Signal.compose({ signal: controller.signal, deadlineMs: 5000 });
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig.aborted, false, 'Should not be aborted yet');
      controller.abort();
      assert.equal(sig.aborted, true, 'Should be aborted when caller signal is aborted');
    },
  },
];

for (const { description, exec } of composeSyncScenarios) {
  it(description, exec);
}

const timeoutSyncScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'returns AbortSignal',
    exec: () => {
      const sig = Signal.timeout(5000);
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
    },
  },
];

for (const { description, exec } of timeoutSyncScenarios) {
  it(description, exec);
}

// Timing-dependent — kept as flat it()
it('returns a signal that fires after ~deadlineMs', async () => {
  const sig = await Signal.compose({ deadlineMs: 50 });
  assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
  assert.equal(sig.aborted, false, 'Should not be aborted immediately');
  await delay(80);
  assert.equal(sig.aborted, true, 'Should be aborted after deadline');
});

it('returns an AbortSignal that fires after the given ms', async () => {
  const sig = Signal.timeout(50);
  assert.equal(sig.aborted, false, 'Should not be aborted immediately');
  await delay(80);
  assert.equal(sig.aborted, true, 'Should be aborted after timeout');
});

const instanceScenarios: Array<{ description: string; exec: () => Promise<void> }> = [
  {
    description: 'instance compose with empty options',
    exec: async () => {
      const s = Signal.create();
      const sig = await s.compose({});
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig, Signal.never(), 'Should fall back to the never-aborting sentinel');
    },
  },
  {
    description: 'instance compose with provided signal',
    exec: async () => {
      const s = Signal.create();
      const controller = new AbortController();
      const sig = await s.compose({ signal: controller.signal });
      assert.equal(sig, controller.signal, 'Should return the exact provided signal');
    },
  },
  {
    description: 'instance timeout returns AbortSignal',
    exec: async () => {
      const s = Signal.create();
      const sig = s.timeout(5000);
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
    },
  },
];

for (const { description, exec } of instanceScenarios) {
  it(description, exec);
}

const onComposeScenarios: Array<{ description: string; options: ComposeOptions }> = [
  {
    description: 'fires with signal-only options',
    options: { signal: new AbortController().signal },
  },
  {
    description: 'fires with deadline-only options',
    options: { deadlineMs: 1000 },
  },
  {
    description: 'fires with empty options (never fallback)',
    options: {},
  },
];

for (const { description, options } of onComposeScenarios) {
  it(`onCompose hook: ${description}`, async () => {
    const s = new RecordingSignal();
    const result = await s.compose(options);

    assert.equal(s.calls.length, 1, 'onCompose should fire exactly once per compose() call');
    assert.equal(s.calls[0]?.options, options, 'onCompose should receive the exact options object');
    assert.equal(s.calls[0]?.result, result, 'onCompose should receive the returned AbortSignal');
    assert.ok(s.calls[0]?.result instanceof AbortSignal, 'result should be an AbortSignal');
  });
}

it('onCompose does not fire for static Signal.compose (default instance is internal)', async () => {
  // Static Signal.compose delegates to an internal default instance, not a
  // subclass, so overriding onCompose on a subclass has no effect on the
  // static entry point — this documents that boundary.
  const sig = await Signal.compose({ deadlineMs: 25 });
  assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
});

class RecordingTimeoutSignal extends Signal {
  public calls: Array<{ ms: number; result: AbortSignal }> = [];

  protected override onTimeout(ms: number, result: AbortSignal): void {
    this.calls.push({ ms, result });
  }
}

it('onTimeout hook: fires when timeout() is called on an instance', () => {
  const s = new RecordingTimeoutSignal();
  const result = s.timeout(1000);

  assert.equal(s.calls.length, 1, 'onTimeout should fire exactly once per timeout() call');
  assert.equal(s.calls[0]?.ms, 1000, 'onTimeout should receive the exact ms argument');
  assert.equal(s.calls[0]?.result, result, 'onTimeout should receive the returned AbortSignal');
  assert.ok(s.calls[0]?.result instanceof AbortSignal, 'result should be an AbortSignal');
});

it('onTimeout does not fire for static Signal.timeout (default instance is internal)', () => {
  // Static Signal.timeout delegates to an internal default instance, not a
  // subclass, so overriding onTimeout on a subclass has no effect on the
  // static entry point — mirrors the same boundary documented for compose().
  const sig = Signal.timeout(25);
  assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
});

it('a throwing onCompose hook surfaces as a HookInvocationError from compose()', async () => {
  const originalError = new Error('onCompose boom');

  class ThrowingSignal extends Signal {
    static build(): ThrowingSignal {
      return new ThrowingSignal();
    }

    protected override onCompose(): void {
      throw originalError;
    }
  }

  const controller = new AbortController();

  await assert.rejects(
    ThrowingSignal.build().compose({ 'signal': controller.signal }),
    (err: unknown) => {
      assert.ok(err instanceof HookInvocationError, 'Should throw a HookInvocationError');
      assert.equal(err.hookName, 'onCompose', 'hookName should identify the failing hook');
      assert.equal(err.cause, originalError, 'cause should be the original thrown error');
      return true;
    },
  );
});

it('an async onCompose rejection also surfaces as a HookInvocationError from compose()', async () => {
  const originalError = new Error('onCompose async boom');

  class AsyncThrowingSignal extends Signal {
    protected override async onCompose(): Promise<void> {
      await delay(1);
      throw originalError;
    }
  }

  await assert.rejects(
    new AsyncThrowingSignal().compose({}),
    (err: unknown) => {
      assert.ok(err instanceof HookInvocationError, 'Should throw a HookInvocationError');
      assert.equal(err.hookName, 'onCompose', 'hookName should identify the failing hook');
      assert.equal(err.cause, originalError, 'cause should be the original thrown error');
      return true;
    },
  );
});

it('a throwing onTimeout hook surfaces as a HookInvocationError from an unawaited invoke() call', async () => {
  const originalError = new Error('onTimeout boom');

  class ThrowingTimeoutSignal extends Signal {
    protected override onTimeout(): void {
      throw originalError;
    }
  }

  assert.throws(
    () => new ThrowingTimeoutSignal().timeout(1000),
    (err: unknown) => {
      assert.ok(err instanceof HookInvocationError, 'Should throw a HookInvocationError');
      assert.equal(err.hookName, 'onTimeout', 'hookName should identify the failing hook');
      assert.equal(err.cause, originalError, 'cause should be the original thrown error');
      return true;
    },
  );
});

it('an async onTimeout rejection is routed through the HookInvoker safety net without an unhandled rejection', async () => {
  const originalError = new Error('onTimeout async boom');
  const seenRejections: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => { seenRejections.push(reason); };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    class AsyncThrowingTimeoutSignal extends Signal {
      protected override async onTimeout(): Promise<void> {
        await delay(1);
        throw originalError;
      }
    }

    const sig = new AsyncThrowingTimeoutSignal().timeout(1000);
    assert.ok(sig instanceof AbortSignal, 'timeout() should still synchronously return the computed AbortSignal');

    // Give the async onTimeout hook's rejection a chance to surface. If the
    // call site at Signal.timeout() discarded the invoke() return value (the
    // bug this test guards against), the rejection would have no `.catch`
    // anywhere in the chain and Node would report an unhandled rejection.
    await delay(20);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }

  assert.equal(seenRejections.length, 0, 'the async onTimeout rejection must never surface as an unhandled rejection');
});

it('a HookInvoker subclass overriding onHookError can swallow a throwing onCompose hook', async () => {
  // HookInvoker is composed, not extended by Signal, so failure disposition
  // is customized by subclassing HookInvoker itself (the delegate) and
  // injecting it via Signal's constructor — not by overriding onHookError on
  // a Signal subclass, which no longer has any hook-invocation machinery to
  // override.
  class SwallowingHookInvoker extends HookInvoker {
    // Overriding onHookError to return instead of throw fully swallows the
    // failure: invoke() never re-throws on its own, it only returns
    // whatever onHookError produces. compose() ignores that returned value
    // anyway (it returns its own locally computed `result`), so this simply
    // proves compose() no longer rejects once onHookError stops throwing.
    protected override onHookError<T>(_hookName: string, _cause: unknown): T {
      return undefined as T;
    }
  }

  class SwallowingSignal extends Signal {
    constructor() {
      super(new SwallowingHookInvoker());
    }

    protected override onCompose(): void {
      throw new Error('onCompose boom');
    }
  }

  const s = new SwallowingSignal();
  const sig = await s.compose({});
  assert.ok(sig instanceof AbortSignal, 'Should still return the computed AbortSignal');
});

it('raceTimeout resolves "timeout" when the timer wins with no signal supplied', async () => {
  const outcome = await RaceTimeout.wait(20, undefined);
  assert.equal(outcome, 'timeout');
});

it('raceTimeout resolves "timeout" when the timer wins and removes its abort listener', async () => {
  const controller = new AbortController();
  const removeSpy: string[] = [];
  const originalRemove = controller.signal.removeEventListener.bind(controller.signal);
  controller.signal.removeEventListener = ((...args: Parameters<typeof originalRemove>) => {
    removeSpy.push(args[0]);
    return originalRemove(...args);
  }) as typeof controller.signal.removeEventListener;

  const outcome = await RaceTimeout.wait(20, controller.signal);

  assert.equal(outcome, 'timeout');
  assert.ok(removeSpy.includes('abort'), 'the abort listener should be removed once the timer wins');
});

it('raceTimeout resolves "aborted" promptly when the signal aborts before the timer', async () => {
  const controller = new AbortController();
  const promise = RaceTimeout.wait(5000, controller.signal);
  controller.abort();
  const outcome = await promise;
  assert.equal(outcome, 'aborted');
});

it('raceTimeout resolves "aborted" immediately when the signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();
  const outcome = await RaceTimeout.wait(5000, controller.signal);
  assert.equal(outcome, 'aborted');
});
