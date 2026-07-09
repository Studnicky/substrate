import { IdempotencyGuardError } from './IdempotencyGuardError.js';

/**
 * Thrown when `IdempotencyGuard#run()` is called with a key that already has a
 * cached entry whose payload fingerprint does NOT match the fingerprint of the
 * payload passed to this call. Signals that the caller reused an idempotency
 * key for a semantically different request — replaying the cached result
 * would silently return the wrong answer, so `run()` rejects instead.
 */
export class IdempotencyConflictError extends IdempotencyGuardError {
  public readonly key: string;

  public constructor(key: string) {
    super({
      'code': 'idempotencyGuard.conflict',
      'message': `Idempotency key "${key}" was reused with a different payload.`,
      'metadata': { 'key': key }
    });
    this.key = key;
  }
}
