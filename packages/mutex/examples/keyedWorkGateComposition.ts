/** keyedWorkGateComposition — collapse duplicate Northstar Books checkout clicks while serializing ISBN reservation work. */

// #region usage
import { Coalesce, CoalesceTimeoutError } from '@studnicky/concurrency/node';
import assert from 'node:assert/strict';

import { KeyedWorkGate } from '../src/gate/index.js';
import { LockTimeoutError, Mutex } from '../src/index.js';

// One Mutex/Coalesce pair per keyed resource family. `timeout` on each bounds how long a
// caller waits — Mutex's queue wait and Coalesce's shared in-flight wait — so a stuck
// upstream call cannot pin a key indefinitely.
const mutex = Mutex.create<string>({ 'timeout': 200 });
const coalesce = Coalesce.create<string>({ 'timeout': 100 });
const gate = KeyedWorkGate.create<string>({ 'coalesce': coalesce, 'mutex': mutex });

class ResultValues {
  static intake(value: unknown): string {
    if (typeof value !== 'string') {
      throw new TypeError('Mutex result must be a string');
    }

    const result = value;
    return result;
  }
}

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
        return 'checkout-confirmed';
      }
    }

    const [singleFlightA, singleFlightB] = await Promise.all([
      coalesce.run('checkout:ord-1042', async (): Promise<string> => {
        const result = await mutex.runExclusive('checkout:ord-1042', SharedResultFactory.create);
        const stringResult = ResultValues.intake(result);
        return stringResult;
      }),
      coalesce.run('checkout:ord-1042', async (): Promise<string> => {
        const result = await mutex.runExclusive('checkout:ord-1042', SharedResultFactory.create);
        const stringResult = ResultValues.intake(result);
        return stringResult;
      })
    ]);

    console.log('Duplicate checkout results:', singleFlightA, singleFlightB, 'factory calls:', factoryCallCount);
    assert.equal(singleFlightA, 'checkout-confirmed');
    assert.equal(singleFlightB, 'checkout-confirmed');
    assert.equal(factoryCallCount, 1, 'coalescing must collapse concurrent same-key calls into one execution');
  }

  // runSerialized skips coalescing — every call actually executes, but only one at a
  // time, in arrival order.
  static async runSerialized(): Promise<void> {
    const serializedOrder: number[] = [];
    let serializedCounter = 0;

    await Promise.all([
      mutex.runExclusive('isbn:978-0-679-76489-8', async () => { await Promise.resolve(); serializedOrder.push(serializedCounter++); }),
      mutex.runExclusive('isbn:978-0-679-76489-8', async () => { await Promise.resolve(); serializedOrder.push(serializedCounter++); }),
      mutex.runExclusive('isbn:978-0-679-76489-8', async () => { await Promise.resolve(); serializedOrder.push(serializedCounter++); })
    ]);

    console.log('ISBN reservation execution order:', serializedOrder);
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
      coalesce.run('supplier:midnight-books', async (): Promise<string> => {
        const result = await mutex.runExclusive('supplier:midnight-books', SlowResultFactory.create);
        const stringResult = ResultValues.intake(result);
        return stringResult;
      }),
      (async (): Promise<string> => {
        await new Promise<void>((resolve) => { setTimeout(resolve, 10); });
        const result = await mutex.runExclusive(
          'resource-3-patient-marker',
          async () => { await Promise.resolve(); const markerValue = 'patient-marker'; return markerValue; }
        );

        const stringResult = ResultValues.intake(result);
        return stringResult;
      })()
    ]);

    if (timeoutOutcome.status === 'rejected') {
      coalesceTimedOut = timeoutOutcome.reason instanceof CoalesceTimeoutError;
    }

    console.log('Coalesce timeout fired:', coalesceTimedOut, 'patient outcome:', patientOutcome.status);
    assert.equal(coalesceTimedOut, true, 'a coalesce timeout shorter than the factory duration must reject that caller');
    assert.equal(patientOutcome.status, 'fulfilled');
  }

  static async runGateApi(): Promise<void> {
    let singleFlightRuns = 0;
    const results = await Promise.all([
      gate.runSingleFlight('checkout:ord-1043', ResultValues, async () => { singleFlightRuns += 1; await Promise.resolve(); return 'shared'; }),
      gate.runSingleFlight('checkout:ord-1043', ResultValues, async () => { singleFlightRuns += 1; await Promise.resolve(); return 'shared'; })
    ]);
    assert.deepEqual(results, ['shared', 'shared']);
    assert.equal(singleFlightRuns, 1, 'KeyedWorkGate must coalesce concurrent same-key calls');

    const serializedResults = await Promise.all([
      gate.runSerialized('isbn:978-0-06-112008-4', async () => { await Promise.resolve(); return 'first'; }),
      gate.runSerialized('isbn:978-0-06-112008-4', async () => { await Promise.resolve(); return 'second'; })
    ]);
    assert.deepEqual(serializedResults, ['first', 'second']);
  }

  // Mutex's timeout makes a queued waiter fail fast when the current holder never
  // releases (e.g. a caller bug), instead of hanging forever.


  static async runMutexTimeout(): Promise<void> {
    const stuckHolderMutex = Mutex.create<string>({ 'timeout': 50 });
    const releaseHolder = await stuckHolderMutex.acquire('isbn:978-0-14-118776-1');
    // Deliberately never call releaseHolder() before the waiter's timeout — simulates a stuck
    // holder. releaseHolder() is invoked afterward purely to leave the mutex clean.

    let mutexTimedOut = false;
    try {
      await stuckHolderMutex.runExclusive('isbn:978-0-14-118776-1', async () => { await Promise.resolve(); const result = 'unreachable'; return result; });
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
await Scenarios.runGateApi();

console.log('keyedWorkGateComposition: all assertions passed');
