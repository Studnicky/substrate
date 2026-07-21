/** Default delegate behavior. */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { KeyedWorkGate } from '../../../src/index.js';

const acceptsNumber = (value: unknown): value is number => typeof value === 'number';

it('defaults serialize every same-key call', async () => {
  const gate = KeyedWorkGate.create<string>();
  const order: string[] = [];

  const results = await Promise.all([
    gate.runSerialized('key', async () => { order.push('first'); return 1; }, acceptsNumber),
    gate.runSerialized('key', async () => { order.push('second'); return 2; }, acceptsNumber)
  ]);

  deepStrictEqual(order, ['first', 'second']);
  deepStrictEqual(results, [1, 2]);
  strictEqual(results.length, 2);
});
