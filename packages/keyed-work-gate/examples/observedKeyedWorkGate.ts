/** observedKeyedWorkGate — direct composition of subclassed primitives, plus an extension subclass reaching composed instances via getters. Run: npx tsx examples/observedKeyedWorkGate.ts */

// #region usage
import { Coalesce } from '@studnicky/concurrency';
import { CoalesceOptionsEntity } from '@studnicky/concurrency/entities';
import { Mutex } from '@studnicky/mutex';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

import { KeyedWorkGate } from '../src/index.js';

class TelemetryMutex extends Mutex<string> {
  readonly acquisitions: string[] = [];

  protected override afterAcquire(key: string, waitTimeMs: number): void {
    console.log(`[mutex] acquired '${key}' after ${waitTimeMs}ms wait`);
    this.acquisitions.push(key);
  }

  protected override onEnterKey(key: string, to: 'locked' | 'queued' | 'unlocked', from: 'locked' | 'queued' | 'unlocked'): void {
    console.log(`[mutex] '${key}' ${from} -> ${to}`);
  }
}

class TelemetryCoalesce extends Coalesce<unknown> {
  readonly leaders: string[] = [];
  readonly joiners: string[] = [];

  protected override onCoalesceStart(key: string): void {
    console.log(`[coalesce] '${key}' leader executing`);
    this.leaders.push(key);
  }

  protected override onCoalesceJoin(key: string): void {
    console.log(`[coalesce] '${key}' caller joined in-flight execution`);
    this.joiners.push(key);
  }
}

/**
 * Advanced extension: KeyedWorkGate has no hooks of its own — observability is
 * delegated entirely to the composed primitives. A subclass can still add
 * convenience behavior by reaching the composed instances through the getters.
 */
class ReportingKeyedWorkGate extends KeyedWorkGate<string> {
  readonly #telemetryCoalesce: TelemetryCoalesce;
  readonly #telemetryMutex: TelemetryMutex;

  static tracked(mutex: TelemetryMutex, coalesce: TelemetryCoalesce): ReportingKeyedWorkGate {
    const result = new ReportingKeyedWorkGate(mutex, coalesce);
    return result;
  }

  protected constructor(mutex: TelemetryMutex, coalesce: TelemetryCoalesce) {
    super({ 'coalesce': coalesce, 'mutex': mutex });
    this.#telemetryCoalesce = coalesce;
    this.#telemetryMutex = mutex;
  }

  report(): { 'coalesceJoins': number; 'coalesceLeaders': number; 'mutexAcquisitions': number } {
    return {
      'coalesceJoins': this.#telemetryCoalesce.joiners.length,
      'coalesceLeaders': this.#telemetryCoalesce.leaders.length,
      'mutexAcquisitions': this.#telemetryMutex.acquisitions.length
    };
  }
}
// #endregion usage

let fetchCount = 0;

class WorkResult {
  static async fetch(): Promise<CoalesceOptionsEntity.Type> {
    fetchCount += 1;
    await setTimeout(30);
    const result = CoalesceOptionsEntity.create({ 'timeout': fetchCount });
    return result;
  }
}

// #region usage
const mutex = TelemetryMutex.create();
const coalesce = TelemetryCoalesce.create();

const gate = ReportingKeyedWorkGate.tracked(mutex, coalesce);

// Three concurrent callers for the same key collapse into one execution via
// runSingleFlight — the leader still acquires the mutex before running.
const results = await Promise.all([
  gate.runSingleFlight('user-42', CoalesceOptionsEntity, WorkResult.fetch),
  gate.runSingleFlight('user-42', CoalesceOptionsEntity, WorkResult.fetch),
  gate.runSingleFlight('user-42', CoalesceOptionsEntity, WorkResult.fetch)
]);

console.log('Single-flight results:', results[0], results[1], results[2]);
console.log('Report:', gate.report());
// #endregion usage

assert.ok(gate instanceof ReportingKeyedWorkGate);
assert.equal(fetchCount, 1, 'the coalesced group only invoked fetchUserProfile once');
assert.deepEqual(results[0], results[1]);
assert.deepEqual(results[1], results[2]);

const report = gate.report();

assert.equal(report.coalesceLeaders, 1);
assert.equal(report.coalesceJoins, 2);
assert.equal(report.mutexAcquisitions, 1);

// runSerialized bypasses coalescing entirely: every call actually runs.
let serializedRuns = 0;

await Promise.all([
  gate.runSerialized('user-42', async () => {
    serializedRuns += 1;
    await setTimeout(5);
  }),
  gate.runSerialized('user-42', async () => {
    serializedRuns += 1;
    await setTimeout(5);
  })
]);

assert.equal(serializedRuns, 2, 'runSerialized never skips or shares calls');

console.log('observedKeyedWorkGate: all assertions passed');
