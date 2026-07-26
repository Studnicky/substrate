---
"@studnicky/logger": patch
"@studnicky/fsm": patch
"@studnicky/file-lock": patch
"@studnicky/circular-buffer": patch
"@studnicky/timing": patch
"@studnicky/scheduler": patch
---

### Fixed

- `logger`'s `Logger.scenarios.json` suite and `Logger.loop.spec.ts` drop the `expected.asserted: true` tautology from every case — each case's preceding behavioral assertions already prove the scenario. `LogEventName`'s `component-prefixes` case drops the redundant self-comparison of `input.components` against `expected.components` (and now also asserts `EVENT_COMPONENTS.TIMING`, the one component prefix the case previously left unchecked). `LogStatus.scenarios.json` drops the `input.values` field, which duplicated `expected.values` and was never read by the spec.
- `circular-buffer`'s `CircularBuffer.scenarios.json` drops `shift-never-pushed-returns-undefined`, a verbatim duplicate of `shift-empty-returns-undefined`. `CircularBuffer.subclass.scenarios.json`'s `onEvict-called-with-evicted-item` now drives a longer five-push eviction chain distinct from `create-returns-subclass`, proving FIFO eviction order across three evictions instead of duplicating the same single-eviction fixture.
- `fsm`'s `plain-error-wraps` scenario now throws a non-`Error` primitive from the reducer and asserts the resulting `ReducerThrewError`'s `cause` and the hook-observed `reason` string, exercising `StateMachine`'s `String(cause)` fallback — previously indistinguishable from `wraps-reducer-throw`, which throws a real `Error` and only exercised the `cause.message` branch.
- `file-lock`'s `entities.scenarios.json` adds coverage for `FileLockOptionsEntity`'s previously-unexercised rejection branches: empty `path`, non-positive `pollMs`/`timeoutMs`, and an unexpected extra property under `additionalProperties: false`.
- `timing`'s `immediate-operations` spec drops its upper-bound assertions (`durationMs < 5`, event elapsed `< 5`) taken from two back-to-back `process.hrtime()` reads with no busy-wait spacer — the fragile direction under load. It now asserts non-negativity only, matching every sibling case's lower-bound-only pattern.
- `scheduler`'s `chained-timeout-fire` and `chained-timeout-cancel` specs no longer arm real `setTimeout` stages against a fixed wall-clock buffer. They drive `RealTimeScheduler`'s multi-stage chain deterministically via `node:test`'s `mock.timers` (mocking `Date` and `setTimeout`), ticking virtual time forward one `maxTimeoutDelayMs` stage at a time and cancelling mid-chain, eliminating the wall-clock margin entirely rather than widening it.
