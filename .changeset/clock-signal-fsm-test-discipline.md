---
"@studnicky/clock": patch
"@studnicky/types": patch
"@studnicky/signal": patch
"@studnicky/boundary-kit": patch
"@studnicky/process-kit": patch
"@studnicky/visible-range": patch
"@studnicky/memoize": patch
"@studnicky/config": patch
---

### Changed

- `@studnicky/clock`'s `Clock.scenarios.json` suite derives `long-uptime-precision`'s expected nanosecond value independently of `RealTimeClockProvider.hrtime()`'s internal trunc/multiply/round split, asserts both bounds around `Date.now()` for `real-provider-default-options`, reads the `offsetMs` getter from a subclass in `offset-provider-offset`, and asserts the actual offset-to-nanosecond relationship (rather than bare positivity) in `real-hrtime-positive-with-offset`/`-zero-offset`. Its smoke suite drops a tautological assertion that compared a fixture field to a hardcoded literal ahead of the real import check.
- `@studnicky/types`' `Guard.asNumber` scenarios cover the NaN-passthrough asymmetry with `Guard.isNumber` (which excludes NaN). Its smoke suite drops the same tautological assertion.
- `@studnicky/config`'s `Guard.isObject` scenarios cover `Map` and `Set` inputs, matching the documented plain-object exclusion. Its smoke suite drops the same tautological assertion.
- `@studnicky/signal`'s `Signal.scenarios.json` suite drops four tautological assertions that compared a fixture field to itself ahead of the real behavioral check.
- `@studnicky/boundary-kit`'s `undefined-result-vs-abort` scenario drops a tautological assertion ahead of the real result check.
- `@studnicky/process-kit`'s `rejection` scenario asserts the thrown error's `constructor.name` from within the actual `assert.rejects` callback instead of comparing a fixture field to a hardcoded literal afterward.
- `@studnicky/visible-range`'s `config-validation` `error-args` scenario asserts the constructed error's `cause`, `correlationId`, `metadata`, and `retryable` properties, matching its "structured error metadata" description. `visible-range.scenarios.json`'s `default-overscan` case now exercises a distinct count/itemSize combination instead of duplicating `simple-range` verbatim.
- `@studnicky/memoize`'s `memoize-ttl-stale-options` scenario mocks `Date.now()` to advance past the configured `ttlMs`, proving the option reaches the underlying `LruCache` (an unwired option would keep replaying the first computed value indefinitely).
