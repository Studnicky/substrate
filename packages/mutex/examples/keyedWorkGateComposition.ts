/** keyedWorkGateComposition — hand-composes mutex's Mutex and concurrency's Coalesce into the
 * Coordination Kit's documentation-only KeyedWorkGate recipe (no `@studnicky/keyed-work-gate`
 * package exists; this composition order IS the deliverable). `runSingleFlight` collapses
 * concurrent same-key callers onto one in-flight execution via Coalesce, which itself runs
 * under Mutex-guarded exclusive access; `runSerialized` skips coalescing and goes straight to
 * Mutex for callers that need every call to actually execute. Both primitives' `timeout`
 * options (Mutex's queue-wait ceiling, Coalesce's per-caller wait ceiling) make the
 * composition robust against a stuck caller instead of hanging forever. Run:
 * npx tsx examples/keyedWorkGateComposition.ts */

// #region usage
import { Coalesce, CoalesceTimeoutError } from '@studnicky/concurrency';
import assert from 'node:assert/strict';

import { LockTimeoutError, Mutex } from '../src/index.js';

// One Mutex/Coalesce pair per keyed resource family. `timeout` on each bounds how long a
// caller waits — Mutex's queue wait and Coalesce's shared in-flight wait — so a stuck
// upstream call cannot pin a key indefinitely.
const mutex = Mutex.create<string>({ 'timeout': 200 });
const coalesce = Coalesce.create<unknown>({ 'timeout': 100 });

// #endregion usage

// Each scenario runs its own work and assertions inside one static method, so the
// module ends up with a single call expression per scenario rather than a cluster
// of top-level result bindings.
class Scenarios {
  // Concurrent single-flight callers on the same key share one execution.
  static async runSingleFlight(): Promise<void> {
    let factoryCallCount = 0;
    class SharedResultFactory {
      static async create(): Promise<string> {
        factoryCallCount += 1;
        await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
        return 'resolved-once';
      }
    }

    const [singleFlightA, singleFlightB] = await Promise.all([
      coalesce.run('resource-1', () => { const result = mutex.runExclusive('resource-1', SharedResultFactory.create); return result; }),
      coalesce.run('resource-1', () => { const result = mutex.runExclusive('resource-1', SharedResultFactory.create); return result; })
    ]);

    console.log('Single-flight results:', singleFlightA, singleFlightB, 'factory calls:', factoryCallCount);
    assert.equal(singleFlightA, 'resolved-once');
    assert.equal(singleFlightB, 'resolved-once');
    assert.equal(factoryCallCount, 1, 'coalescing must collapse concurrent same-key calls into one execution');
  }

  // runSerialized skips coalescing — every call actually executes, but only one at a
  // time, in arrival order.
  static async runSerialized(): Promise<void> {
    const serializedOrder: number[] = [];
    let serializedCounter = 0;

    await Promise.all([
      mutex.runExclusive('resource-2', async () => { await Promise.resolve(); serializedOrder.push(serializedCounter++); }),
      mutex.runExclusive('resource-2', async () => { await Promise.resolve(); serializedOrder.push(serializedCounter++); }),
      mutex.runExclusive('resource-2', async () => { await Promise.resolve(); serializedOrder.push(serializedCounter++); })
    ]);

    console.log('Serialized execution order:', serializedOrder);
    assert.deepEqual(serializedOrder, [0, 1, 2], 'every runSerialized call must actually execute, in order');
  }

  // Coalesce's timeout makes a stuck caller fail fast without disturbing the shared
  // in-flight promise — a slow (not stuck-forever) factory still resolves for
  // whoever keeps waiting.
  static async runCoalesceTimeout(): Promise<void> {
    class SlowResultFactory {
      static async create(): Promise<string> {
        await new Promise<void>((resolve) => { setTimeout(resolve, 250); });
        return 'eventually-resolved';
      }
    }

    let coalesceTimedOut = false;
    const [timeoutOutcome, patientOutcome] = await Promise.allSettled([
      coalesce.run('resource-3', () => { const result = mutex.runExclusive('resource-3', SlowResultFactory.create); return result; }),
      (async (): Promise<string> => {
        // A second caller joining the same in-flight promise, with no timeout ceiling of its
        // own on this call path, still receives the eventual result.
        await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
        const result = await mutex.runExclusive(
          'resource-3-patient-marker',
          async () => { await Promise.resolve(); const result = 'patient-marker'; return result; },
          (value): value is string => { const result = typeof value === 'string'; return result; }
        );
        return result;
      })()
    ]);

    if (timeoutOutcome.status === 'rejected') {
      coalesceTimedOut = timeoutOutcome.reason instanceof CoalesceTimeoutError;
    }

    console.log('Coalesce timeout fired:', coalesceTimedOut, 'patient outcome:', patientOutcome.status);
    assert.equal(coalesceTimedOut, true, 'a coalesce timeout shorter than the factory duration must reject that caller');
    assert.equal(patientOutcome.status, 'fulfilled');
  }

  // Mutex's timeout makes a queued waiter fail fast when the current holder never
  // releases (e.g. a caller bug), instead of hanging forever.
  static async runMutexTimeout(): Promise<void> {
    const stuckHolderMutex = Mutex.create<string>({ 'timeout': 50 });
    const releaseHolder = await stuckHolderMutex.acquire('resource-4');
    // Deliberately never call releaseHolder() before the waiter's timeout — simulates a stuck
    // holder. releaseHolder() is invoked afterward purely to leave the mutex clean.

    let mutexTimedOut = false;
    try {
      await stuckHolderMutex.runExclusive('resource-4', async () => { await Promise.resolve(); const result = 'unreachable'; return result; });
    } catch (error) {
      mutexTimedOut = error instanceof LockTimeoutError;
    }

    releaseHolder();

    console.log('Mutex timeout fired:', mutexTimedOut);
    assert.equal(mutexTimedOut, true, 'a queued waiter must time out rather than hang on a stuck holder');
  }
}

// --- Scenario A: concurrent single-flight callers on the same key share one execution. ---
await Scenarios.runSingleFlight();

// --- Scenario B: runSerialized skips coalescing — every call actually executes, but only
// one at a time, in arrival order. ---
await Scenarios.runSerialized();

// --- Scenario C: Coalesce's timeout makes a stuck caller fail fast without disturbing the
// shared in-flight promise — a slow (not stuck-forever) factory still resolves for whoever
// keeps waiting. ---
await Scenarios.runCoalesceTimeout();

// --- Scenario D: Mutex's timeout makes a queued waiter fail fast when the current holder
// never releases (e.g. a caller bug), instead of hanging forever. ---
await Scenarios.runMutexTimeout();

console.log('keyedWorkGateComposition: all assertions passed');
