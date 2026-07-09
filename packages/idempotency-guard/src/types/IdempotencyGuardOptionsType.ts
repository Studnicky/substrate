/** Construction options for {@link IdempotencyGuard}. */
export type IdempotencyGuardOptionsType = {
  /** Maximum number of distinct idempotency keys retained at once. */
  'capacity': number;
  /** Time-to-live (ms) for a cached key/result/fingerprint entry. */
  'ttlMs': number;
};
