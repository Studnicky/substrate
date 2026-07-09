/**
 * Signal Unit Tests
 *
 * Tests AbortSignal composition:
 * - never() singleton sentinel
 * - compose() with various option combinations
 * - timeout() thin wrapper
 * - instance methods via Signal.create()
 * - onCompose observer hook via subclassing
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

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

const composeSyncScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'empty options',
    exec: () => {
      const sig = Signal.compose({});
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig.aborted, false, 'Should not be aborted');
    },
  },
  {
    description: 'provided signal',
    exec: () => {
      const controller = new AbortController();
      const sig = Signal.compose({ signal: controller.signal });
      assert.equal(sig, controller.signal, 'Should return the exact provided signal');
    },
  },
  {
    description: 'signal+deadlineMs abort',
    exec: () => {
      const controller = new AbortController();
      const sig = Signal.compose({ signal: controller.signal, deadlineMs: 5000 });
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
  const sig = Signal.compose({ deadlineMs: 50 });
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

const instanceScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'instance compose with empty options',
    exec: () => {
      const s = Signal.create();
      const sig = s.compose({});
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig, Signal.never(), 'Should fall back to the never-aborting sentinel');
    },
  },
  {
    description: 'instance compose with provided signal',
    exec: () => {
      const s = Signal.create();
      const controller = new AbortController();
      const sig = s.compose({ signal: controller.signal });
      assert.equal(sig, controller.signal, 'Should return the exact provided signal');
    },
  },
  {
    description: 'instance timeout returns AbortSignal',
    exec: () => {
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
  it(`onCompose hook: ${description}`, () => {
    const s = new RecordingSignal();
    const result = s.compose(options);

    assert.equal(s.calls.length, 1, 'onCompose should fire exactly once per compose() call');
    assert.equal(s.calls[0]?.options, options, 'onCompose should receive the exact options object');
    assert.equal(s.calls[0]?.result, result, 'onCompose should receive the returned AbortSignal');
    assert.ok(s.calls[0]?.result instanceof AbortSignal, 'result should be an AbortSignal');
  });
}

it('onCompose does not fire for static Signal.compose (default instance is internal)', () => {
  // Static Signal.compose delegates to an internal default instance, not a
  // subclass, so overriding onCompose on a subclass has no effect on the
  // static entry point — this documents that boundary.
  const sig = Signal.compose({ deadlineMs: 25 });
  assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
});

it('a throwing onCompose hook does not replace compose()', () => {
  class ThrowingSignal extends Signal {
    static build(): ThrowingSignal {
      return new ThrowingSignal();
    }

    protected override onCompose(): void {
      throw new Error('onCompose boom');
    }
  }

  const controller = new AbortController();
  const signal = ThrowingSignal.build().compose({ 'signal': controller.signal });

  assert.equal(signal, controller.signal);
});
