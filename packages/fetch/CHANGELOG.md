# Changelog

## 8.0.0

### Major Changes

- 837480d: ### Changed

  - `FetchClient` direct verb methods are the single request surface for absolute and configured URLs; timeout, abort, body serialization, and dispatcher behavior execute on that path.
  - Client configuration contains only behaviorally effective fields; the unused `name` field is not accepted.
  - Request, response, client configuration, query parameter, body option, fetch option, and dispatcher contracts are exported from `@studnicky/fetch`; `FetchRequestOptionsEntity` and `ClientConfigDataEntity` own their schema-expressible data fields, while interfaces retain headers, signals, callbacks, and other runtime contracts.
  - `UndiciDispatcher.create(agent)` manages health and lifecycle for a caller-owned undici `Agent`; callers retain the Agent they use for request dispatch.
  - `@studnicky/fetch` is the sole public code entrypoint.

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
  - @studnicky/config@8.0.0
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0
  - @studnicky/types@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/config@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/config@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2026-07-08

### Changed

- Exported constant objects use `SCREAMING_SNAKE_CASE`: `DEFAULT_DISPATCHER_CONFIG`, `POOL_HEALTH`, and `VALIDATION_LIMITS`.

### Changed

- `FetchClient`, `InterceptorManager`, and `UndiciDispatcher` constructors are non-public (`protected`). Use `FetchClient.create(config)`, `InterceptorManager.create()`, and `UndiciDispatcher.create(config)` to construct instances.

## [1.0.0] - 2026-06-22

### Added

- FetchClient class with static `create()` factory and direct HTTP verb methods
- Request and response interceptor pipeline — single function or ordered array, applied per-client and per-request
- Protected hook points `onRequestStart`, `onResponseSuccess`, `onRequestError` for subclass telemetry without modifying core behavior
- Undici connection pool dispatcher, query-string utilities, and typed error hierarchy (AbortError, TimeoutError, HTTPError, and more)
