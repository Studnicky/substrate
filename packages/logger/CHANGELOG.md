# Changelog

## 7.0.0

### Minor Changes

- d2b44b7: `@studnicky/types` exports `PickDefined.from(record)`, which strips `undefined`-valued keys from a record while narrowing each remaining value's type away from `undefined` — built for builders assembling an options object from a mix of required and optional fields.

  `@studnicky/errors` exports `DomainErrorArgs.build(fields, options)`, which computes `code`/`message`/`retryable`/`cause`/`correlationId`/`metadata` for a `super()` call so leaf error classes can skip the manual field-assignment ceremony while keeping their `extends` chain and `instanceof` checks intact.

  `@studnicky/logger` exports `ResolveMinLevel.from(options)`, the level-validation-and-resolution logic `ConsoleTransport`/`MemoryTransport` already use internally, now reusable by third-party `TransportInterface` implementations.

- d2b44b7: `@studnicky/errors` exports `HookInvoker`, a composable delegate for safely invoking consumer-supplied lifecycle hooks — synchronous or asynchronous, without forcing async contagion on a synchronous caller and without letting a broken hook produce an unhandled rejection. A class composes it as a field (never extends it directly) and calls `invoke(hookName, fn)` from its own methods; a caller needing a different failure disposition than the default throw defines a small delegate subclass overriding `onHookError`. Also exports `HookInvocationError`, `HookTimeoutError` (thrown when an optional `timeoutMs` elapses before a hook settles), and `ReentrantHookInvocationError` (thrown when `detectReentrancy` catches a synchronous same-call-stack reentrant `invoke`).

  `@studnicky/entity-store`, `@studnicky/file-lock`, `@studnicky/health-registry`, and `@studnicky/worker-pool` route their lifecycle hooks through a record-and-continue `HookInvoker` delegate: a throwing hook override no longer aborts or corrupts an in-flight operation — the failure is recorded instead, inspectable via `hookErrorCount`/`getHookErrors()` (`getHookErrorCount()`/`getHookErrors()` on `WorkerPool`).

  `@studnicky/logger`'s `Logger` composes a plain `HookInvoker` for `onLog`/`onDropped`/`onChildCreate` (unchanged throwing behavior) and separately guards `onTransportError`, recording its failures via `hookErrorCount`/`getHookErrors()` so a broken override can't abort fan-out to the remaining transports.

  `@studnicky/retry` and `@studnicky/pipeline` gain a `hookTimeoutMs` builder option (and matching `Retry.create`/`Pipeline.create` config field) bounding how long an async lifecycle hook may run before it's routed to `onHookError` with a `HookTimeoutError` cause. Left unset, a hook may take arbitrarily long, matching prior behavior.

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

## [5.0.0] - 2026-07-08

### Changed

- **Breaking:** exported log-level constants now use `SCREAMING_SNAKE_CASE`. `LogLevel` and `LogLevelMap` are renamed to `LOG_LEVEL` and `LOG_LEVEL_MAP`.

### Changed

- Logger, ConsoleTransport, MemoryTransport, FunctionTransport, and NoOpTransport constructors are non-public (protected). All instances are created through `Class.create(options)` or `Class.builder().build()`, both of which validate configuration in the single protected constructor.
- LogBody and LogFault constructors are protected; `static create()` uses `new this()` for subclass-safe instantiation.
- BaseLogEntryBuilder has an explicit protected constructor that concrete subclasses funnel through.
- Five new builder classes: LoggerBuilder, ConsoleTransportBuilder, MemoryTransportBuilder, FunctionTransportBuilder, NoOpTransportBuilder — all exported from the package index and the relevant sub-barrels.

## [1.0.0] - 2026-06-23

### Added

- `Logger` core with pluggable `TransportInterface` port; a Logger with no transports is a valid silent logger
- `ConsoleTransport` — writes to console using a level-dispatch map; the only file permitted to use `console`
- `NoOpTransport` — discards all records, replacing the previous `NoOpLogger`
- `MemoryTransport` — captures `LogRecordType` records into an internal buffer; exposes `records()` and `clear()` for test assertion
- `FunctionTransport` — generic bridge adapter; passes each record to a user-supplied sink function, enabling integration with pino, winston, or any external logger
- Per-transport level filtering: each transport accepts an optional `level` option that acts as an independent floor above the Logger global floor
- `LogRecordType` — immutable record assembled at emit time, carrying `level`, `time` (milliseconds), `metadata`, and `data`
- `LoggerOptionsEntity` namespace — `Schema`, `Type`, and `validate` type guard for Logger configuration
- `./transports` package export entry for direct transport imports
- Fluent `LogBody` and `LogFault` builders retained with all required fields enforced at build time
- Child loggers via `.child(metadata)` for correlation ID injection from async context
