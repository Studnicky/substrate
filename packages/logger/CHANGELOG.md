# Changelog

## 8.0.0

### Major Changes

- 837480d: The package root is the sole code entrypoint for logger classes, transports, entities, constants, errors, and contracts.

  Serializable logger data is exposed through `LogRecordEntity.Type`, `LogBodyDataEntity.Type`, `LogFaultDataEntity.Type`, `LogLevelEntity.Type`, and `LogStatusEntity.Type`.

  Entity declarations import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts`, and validator declarations import `ValidateFunction` directly from `ajv`.

  Logger, transport, and log-entry construction uses each class's direct `create()` entry point.

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
  - @studnicky/errors@8.0.0
  - @studnicky/json@8.0.0

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Minor Changes

- d2b44b7: `@studnicky/types` exports `PickDefined.from(record)`, which strips `undefined`-valued keys from a record while narrowing each remaining value's type away from `undefined` — built for builders assembling an options object from a mix of required and optional fields.

  `@studnicky/errors` exports `DomainErrorArgs.build(fields, options)`, which computes `code`, `message`, `retryable`, `cause`, `correlationId`, and `metadata` for a `super()` call while preserving the leaf error's `extends` chain and `instanceof` behavior.

  `@studnicky/logger` exports `ResolveMinLevel.from(options)` for the level validation and resolution shared by built-in and third-party `TransportInterface` implementations.

- d2b44b7: `@studnicky/errors` exports `HookInvoker`, a composable delegate for safely invoking synchronous or asynchronous consumer lifecycle hooks without forcing asynchronous behavior on a synchronous caller or producing an unhandled rejection. A class composes it as a field and calls `invoke(hookName, fn)` from its own methods. The package also exports `HookInvocationError`, `HookTimeoutError` for a configured timeout, and `ReentrantHookInvocationError` for synchronous same-call-stack reentrancy.

  `@studnicky/entity-store`, `@studnicky/file-lock`, `@studnicky/health-registry`, and `@studnicky/worker-pool` route lifecycle hooks through a record-and-continue `HookInvoker` boundary. Failures are available through `hookErrorCount` and `getHookErrors()` (`getHookErrorCount()` and `getHookErrors()` on `WorkerPool`).

  `@studnicky/logger`'s `Logger` composes a plain `HookInvoker` for `onLog`, `onDropped`, and `onChildCreate`, and separately guards `onTransportError`. Transport-hook failures are available through `hookErrorCount` and `getHookErrors()`.

  `@studnicky/retry` and `@studnicky/pipeline` expose a `hookTimeoutMs` builder option and matching `Retry.create` and `Pipeline.create` configuration field. A configured timeout routes an unsettled lifecycle hook to `onHookError` with a `HookTimeoutError` cause; an omitted timeout remains unbounded.

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.0.0] - 2026-07-08

### Changed

- Exported log-level constants use `SCREAMING_SNAKE_CASE`: `LOG_LEVEL` and `LOG_LEVEL_MAP`.

### Changed

- `Logger`, `ConsoleTransport`, `MemoryTransport`, `FunctionTransport`, and `NoOpTransport` expose `Class.create(options)` and `Class.builder().build()` construction paths backed by protected constructors.
- `LogBody` and `LogFault` expose subclass-safe `static create()` construction.
- `BaseLogEntryBuilder` provides the protected constructor used by concrete subclasses.
- `LoggerBuilder`, `ConsoleTransportBuilder`, `MemoryTransportBuilder`, `FunctionTransportBuilder`, and `NoOpTransportBuilder` are exported from the package root and transport barrel where applicable.

## [1.0.0] - 2026-06-23

### Added

- `Logger` core with pluggable `TransportInterface` port; a Logger with no transports is a valid silent logger
- `ConsoleTransport` — writes to console using a level-dispatch map; the only file permitted to use `console`
- `NoOpTransport` — discards all records.
- `MemoryTransport` — captures `LogRecordEntity.Type` records into an internal buffer; exposes `records()` and `clear()` for test assertion.
- `FunctionTransport` — generic bridge adapter; passes each record to a user-supplied sink function, enabling integration with pino, winston, or any external logger
- Per-transport level filtering: each transport accepts an optional `level` option that acts as an independent floor above the Logger global floor
- `LogRecordEntity.Type` — schema-derived record assembled at emit time, carrying `level`, `time` (milliseconds), `metadata`, and `data`.
- `LoggerOptionsEntity` namespace — `Schema`, `Type`, and `validate` type guard for Logger configuration
- `./transports` package export entry for direct transport imports
- Fluent `LogBody` and `LogFault` builders enforce all required fields at build time.
- Child loggers via `.child(metadata)` for correlation ID injection from async context
