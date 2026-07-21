# Changelog

## 8.0.0

### Major Changes

- 837480d: ### Added

  - `BoundedDispatcher` class composing `@studnicky/concurrency`'s `Semaphore`, `@studnicky/event-bus`, and `@studnicky/scheduler` into the "bounded work dispatch" pattern: `dispatch(fn)` acquires a semaphore permit, runs `fn`, and publishes `'dispatch'` lifecycle events (`start` / `success` / `error`) onto the composed `EventBus`; `scheduleDispatch(atMs, fn)` layers a scheduler-driven delayed dispatch on top, returning the scheduler's own cancellable task handle.
  - `BoundedDispatcherConfigInterface`, `BoundedDispatcherTopicMapInterface`, `BoundedDispatcherStartEventInterface`, `BoundedDispatcherSuccessEventInterface`, and `BoundedDispatcherErrorEventInterface` are public runtime contracts. The dispatch interfaces compose their phase discriminants from `BoundedDispatcherStartEventEntity`, `BoundedDispatcherSuccessEventEntity`, and `BoundedDispatcherErrorEventEntity`.
  - `getBus()` exposes the typed dispatch event bus for subscriptions and domain-specific bus behavior.
  - `hookErrorCount` and `getHookErrors()` expose rejected non-blocking lifecycle publications as deeply defensive `HookInvocationError` snapshots without changing the dispatched work's result or error.

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
  - @studnicky/concurrency@8.0.0
  - @studnicky/errors@8.0.0
  - @studnicky/event-bus@8.0.0
  - @studnicky/scheduler@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/concurrency@7.0.1
- @studnicky/event-bus@7.0.1
- @studnicky/scheduler@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/concurrency@7.0.0
  - @studnicky/event-bus@7.0.0
  - @studnicky/scheduler@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
