### @studnicky/batch

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/boundary-kit

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/resilience@12.0.0
  - @studnicky/retry@12.0.0
  - @studnicky/throttle@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/bounded-dispatcher

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/concurrency@12.0.0
  - @studnicky/event-bus@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/scheduler@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/cache

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/circular-buffer

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/clock

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/concurrency

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/circular-buffer@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/config

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/context

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/drilldown

### Patch Changes

- @studnicky/cache@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/entity-store

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0

### @studnicky/errors

### Major Changes

- 46e9a40: Serialize every error as an RFC 9457 Problem Details object, and extract `filters` into its own package.
  
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

### Patch Changes

- @studnicky/intake-kit@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/eslint-config

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/event-bus

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/circular-buffer@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/fetch

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/file-lock

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/virtual-fs@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/filters

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/flag-evaluator

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/fsm

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/circular-buffer@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/health-registry

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/idempotency-guard

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/cache@12.0.0
  - @studnicky/concurrency@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/intake-kit

### Patch Changes

- @studnicky/types@12.0.0

### @studnicky/json

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/intake-kit@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/keyed-rate-limiter

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/cache@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/resilience@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/keyed-work-gate

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/concurrency@12.0.0
  - @studnicky/mutex@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/logger

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/matching

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/cache@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/matching-filters

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/filters@12.0.0
  - @studnicky/matching@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/memoize

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/cache@12.0.0
  - @studnicky/concurrency@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/mutex

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/config@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/paginator

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/pipeline

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/process-kit

### Patch Changes

- @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/scheduler@12.0.0

### @studnicky/request-executor

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/context@12.0.0
  - @studnicky/fetch@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/retry@12.0.0
  - @studnicky/signal@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/resilience

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/scheduler@12.0.0
  - @studnicky/signal@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/retry

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/config@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/sample-buffer

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/scheduler

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/clock@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/semantic-matching

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/signal

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/sliding-window-limiter

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/circular-buffer@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/signal@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/system

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/throttle

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/circular-buffer@12.0.0
  - @studnicky/config@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/sample-buffer@12.0.0
  - @studnicky/signal@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/timing

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/config@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/topic-router

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/matching@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/topic-router-models

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/matching@12.0.0
  - @studnicky/topic-router@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/virtual-fs

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/clock@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/visible-range

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/types@12.0.0

### @studnicky/worker-pool

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/batch@12.0.0
  - @studnicky/concurrency@12.0.0
  - @studnicky/fsm@12.0.0
  - @studnicky/json@12.0.0
  - @studnicky/signal@12.0.0
  - @studnicky/system@12.0.0
  - @studnicky/types@12.0.0
