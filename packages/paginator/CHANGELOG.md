# Changelog

## 9.1.0

### Patch Changes

- 789da06: ### Fixed

  - `event-bus`'s `on-drop-noop` spec publishes to a subscriber whose queue is already aborted and asserts the observed `onDrop` event, instead of closing two buses without ever calling `publish()`.
  - `resilience`'s `resilience-tokenbucket-wait-refill` spec asserts `completed` is still `false` immediately after a clock tick that is insufficient to refill a token, then asserts `bucket.available` after the wait resolves, instead of only checking a flag set inside the very promise being awaited.
  - `cache`'s `delete-where-none` spec uses a real value-derived predicate over non-matching entries, instead of a predicate that ignores its `(key, value)` arguments and returns a hardcoded `false`. `invalid-options` asserts `instanceof CacheConfigError` as the primary check instead of exact Ajv-generated message prose.
  - `keyed-rate-limiter`'s `throwing-on-key-evicted` spec tracks and asserts the same `created`/`evicted` key sequence as its non-throwing sibling scenarios, instead of only asserting a hardcoded `completed` flag.
  - `flag-evaluator`'s `half-rollout` spec derives its diversity check from live `evaluate()` results captured during the loop, instead of reading the fixture's own hardcoded `result` fields. `invalid-rollout-range` asserts `instanceof FlagDefinitionValidationError` instead of raw Ajv default wording.
  - `paginator`'s `discriminant-narrowing` spec drives a real `Paginator` through `next()`/`reset()` and asserts on `.pages`/`hasNext()`, instead of comparing spec-local helper functions against their own hardcoded output without exercising any `Paginator` source.

- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
- Updated dependencies [789da06]
  - @studnicky/errors@9.1.0
  - @studnicky/fsm@9.1.0
  - @studnicky/json@9.1.0

## 9.0.0

### Major Changes

- d5be000: ### Changed

  - Pagination state, events, and cursors use explicit discriminated entity and interface variants. `next(page, nextCursor)` accepts `PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type`, and lifecycle hooks compose the exported state and event variants directly.

  ### Added

  - `Paginator<TPage, TCursor>` class tracking cursor/page-list state for a paginated data source. Composes an internal `@studnicky/fsm` `StateMachine` (`idle` → `hasMore` → `exhausted`, with `reset()` back to `idle` from any state) without fetching data itself — callers supply fetched pages via `next(page, nextCursor)`.
  - `hasNext()`, `.pages`, `next()`, and `reset()` public API.
  - Protected lifecycle hooks (`onTransition`, `onEnterState`, `onExitState`, `onTransitionRejected`) delegated from the internal machine for subclass-level observability, following the substrate no-op hook idiom.

- d5be000: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

### Patch Changes

- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
- Updated dependencies [d5be000]
  - @studnicky/errors@9.0.0
  - @studnicky/fsm@9.0.0
  - @studnicky/json@9.0.0

## 8.0.1

### Patch Changes

- The test estate uses the controlled test-suite harness for coverage and JSON-backed loop fixtures with `input.batch` fan-out configuration across package scenario suites.
- Updated dependencies
  - @studnicky/errors@8.0.1
  - @studnicky/fsm@8.0.1
  - @studnicky/json@8.0.1

## 8.0.0

### Major Changes

- 837480d: ### Changed

  - Pagination state, events, and cursors use explicit discriminated entity and interface variants. `next(page, nextCursor)` accepts `PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type`, and lifecycle hooks compose the exported state and event variants directly.

  ### Added

  - `Paginator<TPage, TCursor>` class tracking cursor/page-list state for a paginated data source. Composes an internal `@studnicky/fsm` `StateMachine` (`idle` → `hasMore` → `exhausted`, with `reset()` back to `idle` from any state) without fetching data itself — callers supply fetched pages via `next(page, nextCursor)`.
  - `hasNext()`, `.pages`, `next()`, and `reset()` public API.
  - Protected lifecycle hooks (`onTransition`, `onEnterState`, `onExitState`, `onTransitionRejected`) delegated from the internal machine for subclass-level observability, following the substrate no-op hook idiom.

- 837480d: This release establishes one canonical public path across the fixed `@studnicky/*` package group. Consumers import package-owned behavior, errors, entities, and interfaces from the owning package root, construct stateful primitives through `Class.create(config)`, and invoke direct operation methods. Package code subpaths and parallel construction APIs are outside the public contract.

  Composition packages expose the ordering, failure, aggregation, or publication behavior they own. Dependency functionality stays with its declaring package and is imported directly from that package root. Collaborator accessors do not mirror scheduler, semaphore, cache, coalescer, fetch, retry, signal, timing, context, machine, or interpreter APIs. `BoundedDispatcher.getBus()` remains the functional access path for subscribing to and draining dispatcher-owned publications.

  Every JSON-Schema-expressible pure-data structure is a schema-derived type alias. Interfaces represent only runtime, callable, constructor, nominal, readonly-access, class-bearing, or other contracts that are not wholly schema-expressible. Pure data referenced by an interface is declared separately as a schema-derived named type. Declaration comments provide no exemptions, and `entitySuite` configures `@typescript-eslint/prefer-function-type` as `off` so callable interfaces receive one consistent verdict.

  Schema and validator declarations import dependency-owned symbols directly: `FromSchema` and `JSONSchema` from `json-schema-to-ts`, `ValidateFunction` from `ajv`, and `JSONSchema7Type` from `json-schema`. Each consuming package declares the dependency it uses; substrate packages do not proxy-export those declarations.

  `HookInvoker.invoke(hookName, fn)` enters synchronous hooks and returns `undefined`. `HookInvoker.invokeAsync(hookName, fn)` observes completion and returns `Promise<void>`. `onHookError(hookName, cause)` controls failure disposition without fabricating a recovery value, while hook timeout and reentrancy failures retain their package error identities.

  FSM and process orchestration use one optional `EffectHandlerInterface<TEffect, TEvent>` handler. `EffectInterpreter`, `InterpreterHistory`, and `ProcessKit` accept it through their direct `create(config)` paths. `InterpreterHistory` retains bounded, oldest-first variant-changing transition records and returns isolated readonly snapshots.

  `Signal.create()` supplies instance `compose(options)` and `timeout(ms)` lifecycle behavior; `Signal.never()` supplies the static never-aborting sentinel. `Delay.sleep(ms, { clock?, scheduler?, signal? })` and `Delay.value(...)` share the scheduler-aware cancellation path.

  `Throttle.create(config)` validates and copies caller configuration into instance-owned state. Adaptive concurrency changes only the instance's effective limit. `getStats()` returns `ThrottleStatsEntity.Type`, and `ThrottleStatsEntity.validate` is the root-exported compiled validator for trust-boundary checks.

### Patch Changes

- Updated dependencies [837480d]
- Updated dependencies [837480d]
- Updated dependencies [837480d]
- Updated dependencies [837480d]
  - @studnicky/errors@8.0.0
  - @studnicky/fsm@8.0.0
  - @studnicky/json@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/fsm@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/fsm@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
