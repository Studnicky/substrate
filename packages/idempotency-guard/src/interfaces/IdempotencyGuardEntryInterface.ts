import type { IdempotencyGuardEntryMetadataEntity } from '../entities/IdempotencyGuardEntryMetadataEntity.js';

/** Immutable cached fingerprint and caller-supplied runtime result for one idempotency key. */
export interface IdempotencyGuardEntryInterface<TResult = unknown> {
  /** `Hash.value()` fingerprint of the payload that produced `result`. */
  readonly 'fingerprint': IdempotencyGuardEntryMetadataEntity.Type['fingerprint'];
  /** The factory's resolved value for the call that populated this entry. */
  readonly 'result': TResult;
}
