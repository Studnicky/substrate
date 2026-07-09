/**
 * runSingleFlight: concurrent same-key calls collapse into one execution,
 * that execution still holds the mutex, and different keys never block each other.
 */

import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, it } from 'node:test';

import { KeyedWorkGate } from '../../../src/index.js';

void describe('runSingleFlight — same-key collapsing', () => {
  void it('runs fn exactly once for concurrent same-key callers and shares the result', async () => {
    const gate = KeyedWorkGate.create<string>();
    let calls = 0;

    const fn = async (): Promise<string> => {
      calls += 1;
      await delay(30);
      return 'shared-result';
    };

    const [a, b, c] = await Promise.all([
      gate.runSingleFlight('user1', fn),
      gate.runSingleFlight('user1', fn),
      gate.runSingleFlight('user1', fn)
    ]);

    assert.equal(calls, 1);
    assert.equal(a, 'shared-result');
    assert.equal(b, 'shared-result');
    assert.equal(c, 'shared-result');
  });

  void it('runs fn again for a new same-key group once the prior group has settled', async () => {
    const gate = KeyedWorkGate.create<string>();
    let calls = 0;

    const fn = async (): Promise<number> => {
      calls += 1;
      return calls;
    };

    const first = await gate.runSingleFlight('user1', fn);
    const second = await gate.runSingleFlight('user1', fn);

    assert.equal(calls, 2);
    assert.equal(first, 1);
    assert.equal(second, 2);
  });
});

void describe('runSingleFlight — mutex fall-through', () => {
  void it('the coalesced leader execution still holds the mutex against a concurrent runSerialized call on the same key', async () => {
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];

    const leader = gate.runSingleFlight('user1', async () => {
      order.push('single-flight-start');
      await delay(40);
      order.push('single-flight-end');
      return 'leader';
    });

    // Give the single-flight leader time to acquire the mutex first.
    await delay(10);

    const serialized = gate.runSerialized('user1', async () => {
      order.push('serialized-start');
      await delay(10);
      order.push('serialized-end');
      return 'serialized';
    });

    await Promise.all([leader, serialized]);

    assert.deepEqual(order, [
      'single-flight-start',
      'single-flight-end',
      'serialized-start',
      'serialized-end'
    ]);
  });
});

void describe('runSingleFlight — key isolation', () => {
  void it('different keys do not block each other', async () => {
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];

    await Promise.all([
      gate.runSingleFlight('user1', async () => {
        order.push('user1-start');
        await delay(40);
        order.push('user1-end');
        return 'user1';
      }),
      gate.runSingleFlight('user2', async () => {
        order.push('user2-start');
        await delay(10);
        order.push('user2-end');
        return 'user2';
      })
    ]);

    // user2 has the shorter delay; if the two keys blocked each other, user2 could not
    // finish before user1.
    assert.ok(order.indexOf('user2-end') < order.indexOf('user1-end'));
  });
});
