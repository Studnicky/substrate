/**
 * Signal Unit Tests
 *
 * Tests AbortSignal composition:
 * - never() singleton sentinel
 * - compose() with various option combinations
 * - instance compose() method
 * - onCompose observer hook via subclassing
 * - onHookError override swallowing a failing onCompose hook
 * - RaceTimeout.wait timer/signal racing
 */

import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
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
      const sig = await Signal.create().compose({});
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig.aborted, false, 'Should not be aborted');
    },
  },
  {
    description: 'provided signal',
    exec: async () => {
      const controller = new AbortController();
      const sig = await Signal.create().compose({ signal: controller.signal });
      assert.equal(sig, controller.signal, 'Should return the exact provided signal');
    },
  },
  {
    description: 'signal+deadlineMs abort',
    exec: async () => {
      const controller = new AbortController();
      const sig = await Signal.create().compose({ signal: controller.signal, deadlineMs: 5000 });
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

// Timing-dependent — kept as flat it()
it('returns a signal that fires after ~deadlineMs', async () => {
  const sig = await Signal.create().compose({ deadlineMs: 50 });
  assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
  assert.equal(sig.aborted, false, 'Should not be aborted immediately');
  await delay(80);
  assert.equal(sig.aborted, true, 'Should be aborted after deadline');
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

it('a HookInvoker subclass overriding onHookError can swallow a throwing onCompose hook', async () => {
  // HookInvoker is composed, not extended by Signal, so failure disposition
  // is customized by subclassing HookInvoker itself (the delegate) and
  // injecting it via Signal's constructor — not by overriding onHookError on
  // a Signal subclass, which no longer has any hook-invocation machinery to
  // override.
  class SwallowingHookInvoker extends HookInvoker {
    // Completing normally instead of throwing fully swallows the failure;
    // compose() still returns its independently computed signal.
    protected override onHookError(_hookName: string, _cause: unknown): void {}
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
  const pending = RaceTimeout.wait(20, controller.signal);

  assert.equal(getEventListeners(controller.signal, 'abort').length, 1, 'the abort listener should be attached while waiting');
  const outcome = await pending;

  assert.equal(outcome, 'timeout');
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0, 'the abort listener should be removed once the timer wins');
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
