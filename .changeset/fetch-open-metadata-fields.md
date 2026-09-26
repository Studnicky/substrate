---
"@studnicky/fetch": major
---

`RequestMetadataEntity`, `FetchRequestOptionsEntity`, and `ClientConfigDataEntity` derive an open `Type` for `metadata` — `Record<string, unknown>` — matching the runtime `Schema`, which declares that field as `{ 'type': 'object' }` with no `properties` and no `additionalProperties: false`, so the validator already accepted any object there. Each `Node` previously declared `metadata` with zero properties and the constructor's implicit closed default, so its derived static `Type` had no members and no index signature, rejecting real call sites (`metadata: { operation: 'listUsers', source: 'dashboard' }`) at compile time for data the validator itself always accepted.
