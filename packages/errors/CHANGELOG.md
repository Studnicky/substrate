# Changelog

## 7.0.1

### Patch Changes

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
  - @studnicky/types@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-22

### Added

- `BaseError` abstract class with `code`, `timestamp`, `correlationId`, `retryable`, structured `toJSON()` and `toSerializedError()` serialization, and overridable `serializeExtra()` / `formatUserMessage()` hooks
- `ModuleError` with scenario-defaults API (`ErrorDefaults`), `context`, `statusCode`, and cause-chain traversal helpers (`getCauseChain`, `findCauseOfType`, `hasCauseOfType`)
- `ValidationError` for input validation failures with structured violation list; `CliExitError` for process exit codes
- `ErrorCode`, `ErrorDefaults`, and `HttpStatus` constant maps for standardized code and status assignment
