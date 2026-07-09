/**
 * Getter identity tests — strict identity, not deep equality
 */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import { LruCache } from '@studnicky/cache';
import { Coalesce } from '@studnicky/concurrency';

import { IdempotencyGuard } from '../../../src/index.js';

it('getCache()/getCoalesce() return the exact composed instances', () => {
  const guard = IdempotencyGuard.create({ 'capacity': 10, 'ttlMs': 60_000 });

  const cache = guard.getCache();
  const coalesce = guard.getCoalesce();

  strictEqual(cache instanceof LruCache, true);
  strictEqual(coalesce instanceof Coalesce, true);

  // Getters return the exact same instance across repeated calls — no
  // per-call copy or wrapper.
  strictEqual(guard.getCache(), cache);
  strictEqual(guard.getCoalesce(), coalesce);
});
