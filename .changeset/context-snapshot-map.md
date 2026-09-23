---
"@studnicky/context": major
---

`Context.snapshot()`, `ContextScope.terminate()`, and `Context.run()`'s returned `snapshot` field return a `ReadonlyMap<string, unknown>` instead of an anonymous `Record<string, unknown>`. Context keys are arbitrary caller-supplied strings, so the map key stays `string`; read a value with `.get(key)` and check presence with `.has(key)` instead of property access.
