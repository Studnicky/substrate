import { Coalesce } from '@studnicky/concurrency/node';
import { ImmutableSnapshot } from '@studnicky/json/node';
import { JsonValue, Predicates } from '@studnicky/types/node';
/** idempotencyReplayComposition — Node-only recipe that composes a bounded replay cache with keyed single-flight. Run: npx tsx examples/idempotencyReplayComposition.ts */
import assert from 'node:assert/strict';

import { LruCache } from '../src/index.js';

interface InFlightPayloadInterface {
  readonly 'payload': unknown;
}

interface ReplayEntryInterface {
  readonly 'payload': unknown;
  readonly 'result': unknown;
}

// #region usage
class IdempotencyReplay {
  static readonly #replayCache = LruCache.create<string, ReplayEntryInterface>({
    'capacity': 100,
    'ttlMs': 60_000
  });
  static readonly #coalesce = Coalesce.create<ReplayEntryInterface>();
  static readonly #inFlightPayloads = new Map<string, InFlightPayloadInterface>();

  static async execute(
    key: string,
    payload: unknown,
    operation: () => Promise<unknown>
  ): Promise<unknown> {
    if (!JsonValue.is(payload)) {
      throw new TypeError('idempotency payload must be finite, acyclic JSON');
    }

    const payloadSnapshot = ImmutableSnapshot.from(payload);
    const cached = IdempotencyReplay.#replayCache.tryGet(key);

    if (cached.found) {
      const cachedEntry = cached.value;
      if (cachedEntry === undefined) {
        throw new Error(`idempotency cache entry for "${key}" is missing`);
      }
      IdempotencyReplay.requireMatchingPayload(key, cachedEntry.payload, payloadSnapshot);
      return cachedEntry.result;
    }

    const inFlight = IdempotencyReplay.#inFlightPayloads.get(key);
    if (inFlight !== undefined) {
      IdempotencyReplay.requireMatchingPayload(key, inFlight.payload, payloadSnapshot);
    } else {
      IdempotencyReplay.#inFlightPayloads.set(key, { 'payload': payloadSnapshot });
    }

    try {
      const entry = await IdempotencyReplay.#coalesce.run(
        key,
        async (): Promise<ReplayEntryInterface> => {
          const result = await operation();
          const completedEntry: ReplayEntryInterface = { 'payload': payloadSnapshot, 'result': result };
          IdempotencyReplay.#replayCache.set(key, completedEntry);
          return completedEntry;
        }
      );

      IdempotencyReplay.requireMatchingPayload(key, entry.payload, payloadSnapshot);
      return entry.result;
    } finally {
      if (inFlight === undefined) {
        IdempotencyReplay.#inFlightPayloads.delete(key);
      }
    }
  }

  private static requireMatchingPayload(
    key: string,
    expectedPayload: unknown,
    actualPayload: unknown
  ): void {
    if (!Predicates.areDeeplyEqual(expectedPayload, actualPayload)) {
      throw new Error(
        `idempotency key "${key}" is already associated with a different JSON payload`
      );
    }
  }
}
// #endregion usage

class IdempotencyReplayAssertions {
  static async run(): Promise<void> {
    await IdempotencyReplayAssertions.verifyStoredUndefinedReplay();
    await IdempotencyReplayAssertions.verifyConcurrentReplay();
    await IdempotencyReplayAssertions.verifyInvalidPayloadRejection();
  }

  private static async verifyStoredUndefinedReplay(): Promise<void> {
    let executions = 0;
    const result = await IdempotencyReplay.execute(
      'undefined-result',
      { 'orderId': 'order-1' },
      (): Promise<undefined> => {
        executions += 1;
        const completion = Promise.resolve(undefined);
        return completion;
      }
    );
    const replayedResult = await IdempotencyReplay.execute(
      'undefined-result',
      { 'orderId': 'order-1' },
      (): Promise<undefined> => {
        executions += 1;
        const completion = Promise.resolve(undefined);
        return completion;
      }
    );

    assert.equal(result, undefined);
    assert.equal(replayedResult, undefined);
    assert.equal(executions, 1);
  }

  private static async verifyConcurrentReplay(): Promise<void> {
    const completion = Promise.withResolvers<string>();
    let executions = 0;
    const firstPayload = { 'request': { 'amount': 500, 'currency': 'USD' } };
    const first = IdempotencyReplay.execute(
      'concurrent-charge',
      firstPayload,
      async (): Promise<string> => {
        executions += 1;
        return await completion.promise;
      }
    );
    firstPayload.request.amount = 999;
    const second = IdempotencyReplay.execute(
      'concurrent-charge',
      { 'request': { 'amount': 500, 'currency': 'USD' } },
      (): Promise<string> => {
        executions += 1;
        const skipped = Promise.resolve('should not run');
        return skipped;
      }
    );
    const conflict = IdempotencyReplay.execute(
      'concurrent-charge',
      { 'request': { 'amount': 501, 'currency': 'USD' } },
      (): Promise<string> => {
        const skipped = Promise.resolve('should not run');
        return skipped;
      }
    );

    completion.resolve('charged');

    await assert.rejects(conflict, {
      'message':
        'idempotency key "concurrent-charge" is already associated with a different JSON payload'
    });
    const results = await Promise.all([first, second]);

    assert.equal(results[0], 'charged');
    assert.equal(results[1], 'charged');
    assert.equal(executions, 1);
  }

  private static async verifyInvalidPayloadRejection(): Promise<void> {
    await assert.rejects(
      IdempotencyReplay.execute('invalid-payload', undefined, (): Promise<string> => {
        const skipped = Promise.resolve('should not run');
        return skipped;
      }),
      { 'message': 'idempotency payload must be finite, acyclic JSON' }
    );
  }
}

await IdempotencyReplayAssertions.run();

console.log('idempotencyReplayComposition: all assertions passed');
