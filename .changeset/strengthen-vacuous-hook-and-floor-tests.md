---
"@studnicky/retry": patch
"@studnicky/logger": patch
"@studnicky/entity-store": patch
"@studnicky/bounded-dispatcher": patch
"@studnicky/context": patch
"@studnicky/errors": patch
---

### Fixed

- `retry`'s `failed-requests-increment` and `total-retries-counted` stats specs assert the rejection with `assert.rejects` before reading stats, instead of parking every assertion inside an unchecked `.catch()` handler that silently skips if `execute()` resolves.
- `logger`'s `global-floor-*` and `transport-floor-warn` specs assert the exact ordered list of surviving levels, not just a record count. `create-default`, `create-string-level`, and `create-numeric-level` attach a `MemoryTransport`-free observer and log boundary levels either side of the parsed floor to prove the default and parsed levels take effect.
- `entity-store`'s `hooks-remove-many` spec asserts the exact `{event, id}` sequence removed, not just an event count.
- `bounded-dispatcher`'s `dispatch-concurrency-bound` spec asserts the exact observed concurrency ceiling instead of an inclusive range that also accepts a stricter-than-configured mutex.
- `context`'s `initialize-empty` scenario now initializes with a genuinely empty store, and the `initialize-scope` runner asserts the resulting key set against the fixture instead of hardcoding an unreachable branch.
- `errors`' `timeout-no-dangling-timer` spec asserts the hook-timeout race's timer is cleared via a `clearTimeout` spy, instead of an observation window far shorter than the timer it claims is not left dangling.
- `retry`'s hook-throw, hook-timeout, fsm, instantiation, backoff-strategy, and retry-support specs drop redundant fixture-literal-to-hardcoded-literal assertions that followed a real check, or replace them with an assertion against the actual thrown error's identity where one was in scope.
