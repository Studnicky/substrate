# Changelog

## 7.0.1

### Patch Changes

- @studnicky/batch@7.0.1
- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/signal@7.0.1
- @studnicky/system@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Minor Changes

- d2b44b7: `@studnicky/errors` exports `HookInvoker`, a composable delegate for safely invoking consumer-supplied lifecycle hooks — synchronous or asynchronous, without forcing async contagion on a synchronous caller and without letting a broken hook produce an unhandled rejection. A class composes it as a field (never extends it directly) and calls `invoke(hookName, fn)` from its own methods; a caller needing a different failure disposition than the default throw defines a small delegate subclass overriding `onHookError`. Also exports `HookInvocationError`, `HookTimeoutError` (thrown when an optional `timeoutMs` elapses before a hook settles), and `ReentrantHookInvocationError` (thrown when `detectReentrancy` catches a synchronous same-call-stack reentrant `invoke`).

  `@studnicky/entity-store`, `@studnicky/file-lock`, `@studnicky/health-registry`, and `@studnicky/worker-pool` route their lifecycle hooks through a record-and-continue `HookInvoker` delegate: a throwing hook override no longer aborts or corrupts an in-flight operation — the failure is recorded instead, inspectable via `hookErrorCount`/`getHookErrors()` (`getHookErrorCount()`/`getHookErrors()` on `WorkerPool`).

  `@studnicky/logger`'s `Logger` composes a plain `HookInvoker` for `onLog`/`onDropped`/`onChildCreate` (unchanged throwing behavior) and separately guards `onTransportError`, recording its failures via `hookErrorCount`/`getHookErrors()` so a broken override can't abort fan-out to the remaining transports.

  `@studnicky/retry` and `@studnicky/pipeline` gain a `hookTimeoutMs` builder option (and matching `Retry.create`/`Pipeline.create` config field) bounding how long an async lifecycle hook may run before it's routed to `onHookError` with a `HookTimeoutError` cause. Left unset, a hook may take arbitrarily long, matching prior behavior.

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/batch@7.0.0
  - @studnicky/json@7.0.0
  - @studnicky/system@7.0.0
  - @studnicky/signal@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Worker message envelopes are exported as `WorkerLogEnvelopeInterface`, `WorkerProgressEnvelopeInterface`, `WorkerResultEnvelopeInterface<TResult>`, and `WorkerErrorEnvelopeInterface`; pool construction uses `WorkerPoolConfigInterface`.

## [1.0.0] - 2026-07-08

### Added

- `WorkerPool` class: bounded `node:worker_threads` pool composing `@studnicky/batch`, `@studnicky/system`, and `@studnicky/signal`. Each `run()` creates at most `concurrency` workers, reuses idle workers for later items in that run, waits for dispatched work to settle, and terminates every live worker before returning. An unexpected mid-task worker exit retries the item once on a replacement worker; a repeated exit rejects it.
- Typed discriminated-union message envelope (`log` / `progress` / `result` / `error`) between worker and pool; `run()` inherits `Batch#process()`'s order-preserved, fail-fast semantics and awaits `Signal.compose({ deadlineMs: timeoutMs })` before each timed task is posted to a worker.
- Protected observability hooks `onMessage`, `onWorkerTimeout`, and `onWorkerError` for logging/tracing/metrics via subclassing; public envelope and configuration interfaces.
