/**
 * Cached entry for a single idempotency key: the structural fingerprint of the
 * payload that produced `result`, stored alongside the result itself so a
 * repeat call can be checked for a payload mismatch in O(1) without a second
 * cache lookup.
 */
// json-schema-uninexpressible: `result` is `unknown` — the factory's resolved value type is caller-supplied and unbounded
export type IdempotencyGuardEntryType = {
  /** `Hash.value()` fingerprint of the payload that produced `result`. */
  'fingerprint': string;
  /** The factory's resolved value for the call that populated this entry. */
  'result': unknown;
};
