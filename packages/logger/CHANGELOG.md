# Changelog

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

## [Unreleased]

### Changed

- The package root is the sole code entrypoint for logger classes, transports, entities, constants, errors, and contracts.
- Serializable logger data is exposed through `LogRecordEntity.Type`, `LogBodyDataEntity.Type`, `LogFaultDataEntity.Type`, `LogLevelEntity.Type`, and `LogStatusEntity.Type`.
- Entity declarations import `JSONSchema` and `FromSchema` directly from `json-schema-to-ts`, and validator declarations import `ValidateFunction` directly from `ajv`.
- Logger, transport, and log-entry construction uses each class's direct `create()` entry point.

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
