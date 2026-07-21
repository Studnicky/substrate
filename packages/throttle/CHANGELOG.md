# Changelog

## 8.0.0

### Major Changes

- 837480d: The package root is the sole public code entrypoint for throttle behavior, entities, errors, validators, and `ThrottleInterface`; scheduling constants remain implementation details. The `Throttle` constructor is protected; instances are created via `Throttle.create(config?)`. FSM state is exported as `ThrottleStateEntity.Type`; adaptive, configuration, statistics, and validation data remain schema-backed entity types, while runtime behavior is an interface. Runtime statistics are validated through `ThrottleStatsEntity.validate`.
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
- Updated dependencies [837480d]
- Updated dependencies [837480d]
- Updated dependencies [837480d]
  - @studnicky/circular-buffer@8.0.0
  - @studnicky/config@8.0.0
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0
  - @studnicky/sample-buffer@8.0.0
  - @studnicky/types@8.0.0
  - @studnicky/signal@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/circular-buffer@7.0.1
- @studnicky/config@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/sample-buffer@7.0.1
- @studnicky/signal@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/sample-buffer@7.0.0
  - @studnicky/circular-buffer@7.0.0
  - @studnicky/config@7.0.0
  - @studnicky/json@7.0.0
  - @studnicky/signal@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `Throttle` class with configurable `concurrencyLimit` (default 10) and sliding window execution — queued operations start as soon as a slot is released.
- `execute<T>(fn)` returns `Promise<T | undefined>`; operations resolve with `undefined` when the throttle is aborted (detach-and-abandon pattern).
- `abort(options?)` cancels all queued and active operations immediately (or after a grace-period timeout), returning `AbortResultEntity.Type` with cancelled, completed, and timedOut counts.
- Optional adaptive concurrency via `AdaptiveConfigEntity.Type` automatically scales the concurrency limit up or down based on observed p95 latency.
