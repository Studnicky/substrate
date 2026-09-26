---
"@studnicky/logger": major
---

`LogBodyDataEntity`, `LogBodyConfigEntity`, `LogFaultConfigEntity` (via `LogBodyConfigEntity`), `LogFaultDataEntity`, and `LoggerOptionsEntity` derive an open `Type` for `context`/`metadata` — `Record<string, unknown>` — matching the runtime `Schema`, which declares each field as `{ 'type': 'object' }` with no `properties` and no `additionalProperties: false`, so the validator already accepted any object there. Each `Node` previously declared the field with zero properties and the constructor's implicit closed default, so its derived static `Type` had no members and no index signature, rejecting real call sites (`context: { resultCount: 42 }`, `metadata: { service: 'api-layer' }`) at compile time for data the validator itself always accepted.
