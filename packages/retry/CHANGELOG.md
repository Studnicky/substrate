# Changelog

## 7.0.1

### Patch Changes

- @studnicky/config@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/logger@7.0.1
- @studnicky/timing@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Minor Changes

- d2b44b7: `@studnicky/errors` exports `HookInvoker`, a composable delegate for safely invoking consumer-supplied lifecycle hooks — synchronous or asynchronous, without forcing async contagion on a synchronous caller and without letting a broken hook produce an unhandled rejection. A class composes it as a field (never extends it directly) and calls `invoke(hookName, fn)` from its own methods; a caller needing a different failure disposition than the default throw defines a small delegate subclass overriding `onHookError`. Also exports `HookInvocationError`, `HookTimeoutError` (thrown when an optional `timeoutMs` elapses before a hook settles), and `ReentrantHookInvocationError` (thrown when `detectReentrancy` catches a synchronous same-call-stack reentrant `invoke`).

  `@studnicky/entity-store`, `@studnicky/file-lock`, `@studnicky/health-registry`, and `@studnicky/worker-pool` route their lifecycle hooks through a record-and-continue `HookInvoker` delegate: a throwing hook override no longer aborts or corrupts an in-flight operation — the failure is recorded instead, inspectable via `hookErrorCount`/`getHookErrors()` (`getHookErrorCount()`/`getHookErrors()` on `WorkerPool`).

  `@studnicky/logger`'s `Logger` composes a plain `HookInvoker` for `onLog`/`onDropped`/`onChildCreate` (unchanged throwing behavior) and separately guards `onTransportError`, recording its failures via `hookErrorCount`/`getHookErrors()` so a broken override can't abort fan-out to the remaining transports.

  `@studnicky/retry` and `@studnicky/pipeline` gain a `hookTimeoutMs` builder option (and matching `Retry.create`/`Pipeline.create` config field) bounding how long an async lifecycle hook may run before it's routed to `onHookError` with a `HookTimeoutError` cause. Left unset, a hook may take arbitrarily long, matching prior behavior.

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/logger@7.0.0
  - @studnicky/config@7.0.0
  - @studnicky/json@7.0.0
  - @studnicky/timing@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.0.0] - 2026-06-28

### Changed

- **Breaking:** the `retryInterceptor` pipeline is replaced by a protected `onRetryScheduled(context)` lifecycle hook. Subclass `Retry` and override it to set `context.delayMs` (using a shipped `BackoffStrategy`), set `context.abort` to stop retrying, or mutate `context.state` across attempts (the hook may be async). Removed: the `retryInterceptor` config field and builder method, the `RetryInterceptorType` type, and the `isRetryInterceptor` guard. The package no longer depends on `@studnicky/pipeline`.
- `Retry`, `DefaultHttpErrorClassifier` construction goes through `static create(options?)` and `static builder()` factory methods. Constructors are non-public. `Retry.builder()` uses the create-closure idiom (type-only import cycle-free).
- `RetryBuilder` adopts the create-closure idiom: `static create(createFn)` instead of a constructor-reference; private fields replace the `config` plain object.
- `ErrorClassifier` abstract base gains a `protected constructor()`.
- `DefaultHttpErrorClassifierBuilder` added as the builder companion for `DefaultHttpErrorClassifier`.

## [1.0.0] - 2026-06-22

### Added

- `Retry` class with configurable `maxRetries`, pluggable error classifiers, and a retryInterceptor pipeline for per-attempt delay control.
- Protected lifecycle hooks (`onAttempt`, `onSuccess`, `onRetryableError`, `onRetryScheduled`, `onGiveUp`) for zero-cost observability via subclassing.
- Per-call FSM (`RetryCallStateType`: `attempting` / `waiting` / `succeeded` / `failed` / `exhausted` / `aborted`) with overridable `guardCall` and `enterCall` hooks.
- `DefaultHttpErrorClassifier` with built-in classification for HTTP 5xx, 429, 408, network errors, and early-retry unknown errors; `ErrorClassifier` base class for custom implementations.
