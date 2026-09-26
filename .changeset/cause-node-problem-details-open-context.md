---
"@studnicky/errors": major
---

`CauseNodeEntity` and `ProblemDetailsEntity` derive an open `Type` for `context` — `Record<string, unknown>` — matching the runtime `Schema`, which declares that field as `{ 'type': 'object' }` with no `properties` and no `additionalProperties: false`, so the validator already accepted any object there. Both `Node`s previously declared `context` with zero properties and the constructor's implicit closed default, so their derived static `Type` had no members and no index signature, rejecting real call sites (`context: { resultCount: 42 }`, `context: { query: '...' }`) at compile time for data the validator itself always accepted. `context` is caller-supplied structured metadata neither entity interprets, so an open type is correct.
