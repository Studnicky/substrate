/**
 * Throttle FSM Unit Tests
 *
 * Verifies the explicit state machine wired into Throttle:
 * idle → active → idle, idle → draining, active → draining,
 * draining → idle, any → aborted (terminal).
 */

import { strictEqual, throws } from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { Throttle } from '../../../src/throttle/index.js';
import type { ThrottleStateType } from '../../../src/types/ThrottleStateType.js';

// ── Test subclass ─────────────────────────────────────────────────────────────

interface TransitionRecord {
  'from': ThrottleStateType;
  'to': ThrottleStateType;
}

/**
 * TrackingThrottle — records every FSM transition for assertion.
 */
class TrackingThrottle extends Throttle {
  readonly transitions: TransitionRecord[] = [];

  override guard(from: ThrottleStateType, to: ThrottleStateType): boolean {
    return super.guard(from, to);
  }

  override onEnter(to: ThrottleStateType, from: ThrottleStateType): void {
    this.transitions.push({ from, to });
  }

  /** Expose current FSM state for assertions. */
  get currentState(): ThrottleStateType {
    return this.state;
  }

  /** Expose transition() as public for illegal-edge tests. */
  public forceTransition(to: ThrottleStateType): void {
    this.transition(to);
  }
}

/**
 * BlockingThrottle — an operation that only resolves when unblocked externally.
 * Lets tests observe the throttle mid-flight without races.
 */
class BlockingThrottle extends TrackingThrottle {
  static withConcurrency(limit: number): BlockingThrottle {
    return new BlockingThrottle({ concurrencyLimit: limit });
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

void describe('Throttle FSM', () => {
  // 1. Initial state
  void it('starts in idle state', () => {
    const throttle = new TrackingThrottle({ concurrencyLimit: 2 });

    strictEqual(throttle.currentState, 'idle');
    strictEqual(throttle.transitions.length, 0);
  });

  // 2. idle → active on first execute
  void it('transitions idle → active when first slot is acquired', async () => {
    const throttle = BlockingThrottle.withConcurrency(2);

    let unblock!: () => void;
    const blocker = new Promise<void>((resolve) => { unblock = resolve; });

    const executePromise = throttle.execute(async () => {
      await blocker;
      return 'done';
    });

    // Yield so the slot acquisition runs synchronously before we assert
    await Promise.resolve();

    const idleToActive = throttle.transitions.find(
      (t) => t.from === 'idle' && t.to === 'active'
    );
    strictEqual(idleToActive !== undefined, true, 'expected idle → active transition');

    unblock();
    await executePromise;
  });

  // 3. active → idle after operation completes
  void it('transitions active → idle when the last operation finishes', async () => {
    const throttle = BlockingThrottle.withConcurrency(2);

    let unblock!: () => void;
    const blocker = new Promise<void>((resolve) => { unblock = resolve; });

    const executePromise = throttle.execute(async () => {
      await blocker;
      return 42;
    });

    await Promise.resolve();

    unblock();
    await executePromise;

    // After await the operation is complete; idle should be back
    strictEqual(throttle.currentState, 'idle');

    const activeToIdle = throttle.transitions.find(
      (t) => t.from === 'active' && t.to === 'idle'
    );
    strictEqual(activeToIdle !== undefined, true, 'expected active → idle transition');
  });

  // 4. idle → draining on drain() with no active work
  void it('transitions idle → draining when drain() is called on an empty throttle', async () => {
    const throttle = new TrackingThrottle({ concurrencyLimit: 2 });

    strictEqual(throttle.currentState, 'idle');

    const drainPromise = throttle.drain();
    await drainPromise;

    const idleToDraining = throttle.transitions.find(
      (t) => t.from === 'idle' && t.to === 'draining'
    );
    strictEqual(idleToDraining !== undefined, true, 'expected idle → draining transition');
  });

  // 5. any → aborted on abort()
  void it('transitions to aborted state after abort() is called', async () => {
    const throttle = new TrackingThrottle({ concurrencyLimit: 2 });

    await throttle.abort();

    strictEqual(throttle.currentState, 'aborted');

    const toAborted = throttle.transitions.find((t) => t.to === 'aborted');
    strictEqual(toAborted !== undefined, true, 'expected a transition to aborted');
  });

  // 6. aborted is terminal — abort() called twice returns early without re-transitioning
  void it('does not add a second aborted transition when abort() is called twice', async () => {
    const throttle = new TrackingThrottle({ concurrencyLimit: 2 });

    await throttle.abort();
    const countAfterFirst = throttle.transitions.filter((t) => t.to === 'aborted').length;

    await throttle.abort();
    const countAfterSecond = throttle.transitions.filter((t) => t.to === 'aborted').length;

    strictEqual(countAfterFirst, countAfterSecond, 'second abort() must not produce another transition');
  });

  // 7. Illegal transition throws with the expected message
  void it('throws on an illegal transition with a message containing "Illegal state transition"', () => {
    /**
     * GuardBlockingThrottle — blocks a specific edge so we can trigger the throw.
     */
    class GuardBlockingThrottle extends TrackingThrottle {
      override guard(from: ThrottleStateType, to: ThrottleStateType): boolean {
        if (from === 'idle' && to === 'active') return false;
        return super.guard(from, to);
      }
    }

    const throttle = new GuardBlockingThrottle({ concurrencyLimit: 2 });

    throws(
      () => { throttle.forceTransition('active'); },
      (err: unknown) => {
        return err instanceof Error && err.message.includes('Illegal state transition');
      }
    );
  });
});
