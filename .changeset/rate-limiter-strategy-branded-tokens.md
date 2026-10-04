---
"@studnicky/resilience": major
"@studnicky/scheduler": patch
---

`RateLimiterStrategyInterface`'s `consume`/`waitForToken` take the branded, validated `RateLimitRequestEntity.Type['tokens']` instead of a plain `number`. With plain `number`, `tokenBucket.consume(-5)` compiled even though `RateLimitRequestEntity`'s schema declares `exclusiveMinimum: 0` for `tokens` — the type could not express the guarantee the doc comment claimed. `KeyedRateLimiter.consume`/`waitForToken`'s own `key`/`tokens` parameters are `unknown`, matching every other public parameter that is about to be intaken; both were previously pre-typed with `RateLimitRequestEntity.InputType`, an unvalidated shape, immediately before the call that validates it.

`@studnicky/resilience` gains `TokenCountEntity` (`exclusiveMinimum: 0`, `default: 1`) — the constraint `TokenBucket.consume`/`waitForToken` and `RateLimitRequestEntity.tokens` both enforce, declared once. `RateLimitRequestEntity` composes it rather than restating the constraint, so the brand `TokenBucket` produces and the brand `KeyedRateLimiter` intakes are the same brand by construction. `TokenBucket.consume`/`waitForToken` validate `tokens` via `TokenCountEntity.validate` (a type-guard, not `intake` — no clone or cycle check needed for a scalar) instead of a hand-rolled `Number.isFinite`/`<= 0` check; the `tokens = 1` parameter default is gone, replaced by the schema's own `default: 1`, which `RateLimitRequestEntity.intake` now fills so `request.tokens` is always present.

`@studnicky/scheduler` updates its `EffectInterpreter.create` call site for the parameter-shape change landing alongside this in `@studnicky/fsm`.
