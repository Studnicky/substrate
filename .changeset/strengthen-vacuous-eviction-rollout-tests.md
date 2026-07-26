---
"@studnicky/event-bus": patch
"@studnicky/resilience": patch
"@studnicky/cache": patch
"@studnicky/keyed-rate-limiter": patch
"@studnicky/flag-evaluator": patch
"@studnicky/paginator": patch
---

### Fixed

- `event-bus`'s `on-drop-noop` spec publishes to a subscriber whose queue is already aborted and asserts the observed `onDrop` event, instead of closing two buses without ever calling `publish()`.
- `resilience`'s `resilience-tokenbucket-wait-refill` spec asserts `completed` is still `false` immediately after a clock tick that is insufficient to refill a token, then asserts `bucket.available` after the wait resolves, instead of only checking a flag set inside the very promise being awaited.
- `cache`'s `delete-where-none` spec uses a real value-derived predicate over non-matching entries, instead of a predicate that ignores its `(key, value)` arguments and returns a hardcoded `false`. `invalid-options` asserts `instanceof CacheConfigError` as the primary check instead of exact Ajv-generated message prose.
- `keyed-rate-limiter`'s `throwing-on-key-evicted` spec tracks and asserts the same `created`/`evicted` key sequence as its non-throwing sibling scenarios, instead of only asserting a hardcoded `completed` flag.
- `flag-evaluator`'s `half-rollout` spec derives its diversity check from live `evaluate()` results captured during the loop, instead of reading the fixture's own hardcoded `result` fields. `invalid-rollout-range` asserts `instanceof FlagDefinitionValidationError` instead of raw Ajv default wording.
- `paginator`'s `discriminant-narrowing` spec drives a real `Paginator` through `next()`/`reset()` and asserts on `.pages`/`hasNext()`, instead of comparing spec-local helper functions against their own hardcoded output without exercising any `Paginator` source.
