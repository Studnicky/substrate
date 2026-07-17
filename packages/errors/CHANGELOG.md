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
  - @studnicky/types@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `ValidationErrors` constructor is now protected; construct via `ValidationErrors.create(items)` or `ValidationErrors.builder().addViolation(v).build()`.
- `ValidationErrors.of()`, `merge()`, and `fromValidatorErrors()` delegate to `create()`.
- `ValidationErrorsBuilder` is a new fluent builder class; exported from the package barrel.

## [1.0.0] - 2026-06-22

### Added

- `BaseError` abstract class with `code`, `timestamp`, `correlationId`, `retryable`, structured `toJSON()` and `toSerializedError()` serialization, and overridable `serializeExtra()` / `formatUserMessage()` hooks
- `ModuleError` with scenario-defaults API (`ErrorDefaults`), `context`, `statusCode`, and cause-chain traversal helpers (`getCauseChain`, `findCauseOfType`, `hasCauseOfType`)
- `ValidationError` for input validation failures with structured violation list; `CliExitError` for process exit codes
- `ErrorCode`, `ErrorDefaults`, and `HttpStatus` constant maps for standardized code and status assignment
