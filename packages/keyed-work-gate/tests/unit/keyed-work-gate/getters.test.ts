/**
 * Getter identity tests — strict identity, not deep equality
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { Coalesce } from '@studnicky/concurrency';
import { Mutex } from '@studnicky/mutex';

import { KeyedWorkGate } from '../../../src/index.js';

it('getters return the exact instances passed into create()', () => {
  const mutex = Mutex.create<string>();
  const coalesce = Coalesce.create<unknown>();

  const gate = KeyedWorkGate.create<string>({
    'coalesce': coalesce,
    'mutex': mutex
  });

  strictEqual(gate.getMutex(), mutex);
  strictEqual(gate.getCoalesce(), coalesce);
});

it('defaults construct real Mutex/Coalesce instances when no config is supplied', () => {
  const gate = KeyedWorkGate.create<string>();

  strictEqual(gate.getMutex() instanceof Mutex, true);
  strictEqual(gate.getCoalesce() instanceof Coalesce, true);
});
