---
"@studnicky/keyed-rate-limiter": patch
---

`RateLimiterStrategyInterface`'s `consume`/`waitForToken` take plain `number` for `tokens` instead of `RateLimitRequestEntity.InputType['tokens']`. A strategy only ever receives `tokens` after `KeyedRateLimiter` has already run it through `RateLimitRequestEntity.intake` — the schema InputType referenced unvalidated input at a call site that only ever sees validated output, and didn't match `TokenBucket`'s own plain-`number` implementation.
