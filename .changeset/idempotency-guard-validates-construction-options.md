---
"@studnicky/idempotency-guard": minor
---

`IdempotencyGuard`'s constructor validates `{ capacity, ttlMs }` through `IdempotencyGuardOptionsEntity.intake` before composing the underlying `LruCache`, matching the boundary-validation convention `@studnicky/resilience`'s `CircuitBreaker` already follows. Invalid options (non-integer or sub-1 `capacity`, negative `ttlMs`, missing fields, or an unrecognized property) throw the new `IdempotencyGuardConfigError` instead of reaching `LruCache` unvalidated.
