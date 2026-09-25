---
"@studnicky/errors": major
---

`ValidationViolationDetailEntity`'s `details` field derives an open `Type` — `Record<string, unknown>` — matching the runtime `Schema`, which declares that field as `{ 'type': 'object' }` with no `properties` and no `additionalProperties: false`, so Ajv/the browser validator already accepted any object there. `ValidationViolationDetailEntity.Node` previously declared `details` with zero properties and the constructor's implicit closed default, so its derived static `Type` had no members and no index signature, rejecting `violation.details?.tags`/`.plain`/`.instance`/`.limit` at compile time for data the validator itself always accepted. `details` is caller-supplied structured metadata that `ValidationError` snapshots defensively and never interprets, so an open type is correct: any object key on `details` now typechecks as `unknown`, narrowed at each read site rather than assumed.
