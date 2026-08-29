---
'@studnicky/errors': major
---

Serialize every error as an RFC 9457 Problem Details object, and extract `filters` into its own package.

**Breaking — `@studnicky/errors`**

`toJSON()` now returns an RFC 9457 Problem Details object, and it is the only serialized form.

- `message` → `detail` (RFC 9457 §3.1.4: the occurrence-specific explanation)
- `name` → `title` (§3.1.2: names the problem TYPE and does not vary per occurrence)
- `cause` (nested object) → `causes` (flat array, nearest first, bounded and cycle-safe)
- `ModuleError` option `statusCode` → `status`, the RFC's own member; `ModuleError.statusCode` is gone, use the inherited `status`
- `ErrorDefaults.*.statusCode` → `ErrorDefaults.*.status`
- `BaseError.toSerializedError()` removed — `toJSON()` is the single serialized form
- `ValidationProblemDetailsEntity` removed; `ValidationErrors.report()` returns `ProblemDetailsEntity.Type`
- `ThrownValueEntity`/`CauseNodeEntity` carry `type`/`title`/`detail` instead of `kind`/`message`; the problem type URI is the discriminant, so no separate classification member exists

New `type` (from the error's `code`), `status`, and `instance` members, plus `code`, `correlationId`, `timestamp`, `retryable`, `context`, `stack` and `causes` as RFC §3.2 extension members. `ProblemDetailsEntity` makes every member optional per §3.1 and keeps the object open per §3.2, so extension members survive intake.

Subclass extras merged by `serializeExtra()` can no longer displace a registered member, and absent members are omitted rather than emitted as `undefined`.

**Breaking — `@studnicky/eslint-config`**

Layer bindings rename their discriminant: `kind` → `unit`. Every `bindings` entry in an `eslint.config.mjs` must be updated.

**Added**

- `@studnicky/eslint-config`: `no-threaded-vocabulary` bans closed-vocabulary tokens (booleans, enums, literal unions) in parameter, field and property positions outside a declared resolution site; `no-function-registries` bans object literals aggregating multiple function implementations.
- `@studnicky/filters`: extracted from `@studnicky/types`.
- `@studnicky/matching`, `@studnicky/matching-filters`, `@studnicky/semantic-matching`, `@studnicky/topic-router`, `@studnicky/topic-router-models`, `@studnicky/drilldown`.
- `@studnicky/types`: `Predicates`, replacing per-package structural guards.

**Fixed**

- `@studnicky/fetch`: `HTTPError` no longer shadows the inherited `status`, and reports the fetched URL as RFC `instance`.
- `eslint.config.mjs`: six packages had no layer binding, silently disabling all four architecture rules for 214 files.
