import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { IdempotencyGuard, IdempotencyPayloadError } from '../../src/index.js';

void describe('IdempotencyGuard payload fingerprinting', () => {
  void it('rejects a payload that JSON cannot serialize with IdempotencyPayloadError carrying the platform cause', async () => {
    const guard = IdempotencyGuard.create({ 'capacity': 4, 'ttlMs': 1000 });
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    await assert.rejects(
      guard.run('key', circular, () => {
        return 'result';
      }),
      (thrown) => {
        const error: unknown = thrown;
        assert.ok(error instanceof IdempotencyPayloadError);
        assert.equal(error.code, 'idempotencyGuard.unserializablePayload');
        assert.ok(error.cause instanceof TypeError);
        return true;
      }
    );
  });
});
