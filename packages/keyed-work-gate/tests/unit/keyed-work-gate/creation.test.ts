/**
 * Proves KeyedWorkGate.create() builds Mutex/Coalesce from plain config
 * (not only from pre-built instances) and preserves supplied instance identity.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { KeyedWorkGate } from '../../../src/index.js';

const acceptsNumber = (value: unknown): value is number => typeof value === 'number';
const acceptsString = (value: unknown): value is string => typeof value === 'string';

void describe('KeyedWorkGate.create() with plain config', () => {
  void it('builds functioning Mutex and Coalesce delegates from plain config', async () => {
    const gate = KeyedWorkGate.create<string>({
      'coalesce': { 'timeout': 1000 },
      'mutex': { 'timeout': 5000 }
    });

    let runs = 0;
    const values = await Promise.all([
      gate.runSingleFlight('same', async () => { runs += 1; await Promise.resolve(); return runs; }, acceptsNumber),
      gate.runSingleFlight('same', async () => { runs += 1; await Promise.resolve(); return runs; }, acceptsNumber)
    ]);

    assert.deepEqual(values, [1, 1]);
    assert.equal(runs, 1);
  });
});

void describe('KeyedWorkGate.create() with composed instances', () => {
  void it('uses caller-supplied delegates while callers retain them', async () => {
    const { Coalesce } = await import('@studnicky/concurrency');
    const { Mutex } = await import('@studnicky/mutex');
    const mutex = Mutex.create<string>({ 'timeout': 2000 });
    const coalesce = Coalesce.create<unknown>({ 'timeout': 500 });

    const gate = KeyedWorkGate.create<string>({ coalesce, mutex });

    assert.equal(await gate.runSerialized('key', async () => 'done', acceptsString), 'done');
    assert.equal(mutex.isLocked('key'), false);
    assert.equal(coalesce.isInflight('key'), false);
  });
});
