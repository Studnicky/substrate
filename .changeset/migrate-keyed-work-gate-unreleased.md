---
"@studnicky/keyed-work-gate": major
---

`KeyedWorkGate<K>` stores `Coalesce<unknown>` and requires a runtime result predicate for `runSingleFlight()` and `runSerialized()`, so every caller proves its result type at the mutex and coalescing boundaries.
