/**
 * runSerialized: every same-key call runs, in sequence, none skipped/shared —
 * non-overlap proven via a shared mutable counter that would show a race if not
 * serialized. Different keys never block each other.
 */

import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';
import { describe, it } from 'node:test';

import { KeyedWorkGate } from '../../../src/index.js';

const acceptsNumber = (value: unknown): value is number => typeof value === 'number';
const acceptsString = (value: unknown): value is string => typeof value === 'string';

void describe('runSerialized — same-key exclusion', () => {
  void it('runs every same-key call, never overlapping (proven via a shared counter)', async () => {
    const gate = KeyedWorkGate.create<string>();
    let active = 0;
    let maxActive = 0;
    let calls = 0;
    const completionOrder: number[] = [];

    const fn = async (index: number): Promise<number> => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls += 1;
      await delay(15);
      active -= 1;
      completionOrder.push(index);
      return index;
    };

    const results = await Promise.all([
      gate.runSerialized('user1', () => fn(0), acceptsNumber),
      gate.runSerialized('user1', () => fn(1), acceptsNumber),
      gate.runSerialized('user1', () => fn(2), acceptsNumber)
    ]);

    assert.equal(calls, 3);
    assert.equal(maxActive, 1, 'no two same-key runSerialized calls ever overlapped');
    assert.deepEqual(completionOrder, [0, 1, 2], 'calls complete in FIFO queue order');
    assert.deepEqual(results, [0, 1, 2]);
  });
});

void describe('runSerialized — key isolation', () => {
  void it('different keys do not block each other', async () => {
    const gate = KeyedWorkGate.create<string>();
    const order: string[] = [];

    await Promise.all([
      gate.runSerialized('user1', async () => {
        order.push('user1-start');
        await delay(40);
        order.push('user1-end');
        return 'user1';
      }, acceptsString),
      gate.runSerialized('user2', async () => {
        order.push('user2-start');
        await delay(10);
        order.push('user2-end');
        return 'user2';
      }, acceptsString)
    ]);

    assert.ok(order.indexOf('user2-end') < order.indexOf('user1-end'));
  });
});
