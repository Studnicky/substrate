---
"@studnicky/resilience": patch
"@studnicky/sample-buffer": patch
"@studnicky/request-executor": patch
"@studnicky/entity-store": patch
"@studnicky/event-bus": patch
"@studnicky/keyed-rate-limiter": patch
"@studnicky/flag-evaluator": patch
"@studnicky/concurrency": patch
---

### Changed

- `@studnicky/resilience`'s `resilience.scenarios.json` suite covers `DeadLetterQueue`'s constructor-time rejection of a non-positive `capacity`. `resilience-tokenbucket-hook-swallows` asserts the deterministic post-refill token count exactly (`5`) instead of a loose `>= 4` threshold.
- `@studnicky/sample-buffer`'s `percentile-range-p95`/`-p99` scenarios assert the exact linearly-interpolated percentile value (`95.05`/`99.01`) instead of a floor/ceil range that an interpolation-free implementation would also satisfy.
- `@studnicky/request-executor`'s `RequestDeadlineEntity` scenarios cover its `additionalProperties: false` and `deadlineMs` type constraint, alongside the existing numeric lower-bound case.
- `@studnicky/entity-store`'s `getAll` cache-invalidation scenario asserts the sorted id sequence before and after a mutation, matching `getAll`'s documented "sorted output" contract, instead of counting `sortComparer` invocations to infer an undocumented internal cache.
- `@studnicky/event-bus`'s `publish-empty-topic` scenario asserts `onPublish` never fires when a topic has no subscribers. `preaborted-caller-signal`'s description and assertions now match what the scenario actually proves: a subscriber registered with an already-aborted signal never receives a published event. `BusQueue`'s `abort-releases-pending` scenario tracks and asserts the pending `enqueue()` call actually resolves after the drain releases it.
- `@studnicky/keyed-rate-limiter`'s scenario suite drops ten dead `completed: true` fixture fields and their self-referential assertions, each sitting after a real behavioral assertion.
- `@studnicky/flag-evaluator`'s `flag-context-entity-accepts` scenario asserts each validation result against the fixture's `expected.result` field instead of a hardcoded literal, dropping the redundant closing assertion.
- `@studnicky/concurrency`'s hand-written `entities.test.ts` duplicate is removed; its assertions were already covered by the data-driven `entities.loop.spec.ts` / `entities.scenarios.json` pair.
