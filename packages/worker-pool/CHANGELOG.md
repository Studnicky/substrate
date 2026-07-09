# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-08

### Added

- `WorkerPool` class: bounded `node:worker_threads` pool composing `@studnicky/batch`, `@studnicky/system`, and `@studnicky/signal`. `run()` fans work items across at most `concurrency` concurrently-running workers, spawning each fresh against `workerPath` and terminating it once its item settles, and resolves an ordered results array.
- Typed discriminated-union message envelope (`log` / `progress` / `result` / `error`) between worker and pool; `run()` inherits `Batch#process()`'s order-preserved, fail-fast semantics; per-task `timeoutMs` via `@studnicky/signal`.
- Protected observability hooks `onMessage`, `onWorkerTimeout`, and `onWorkerError` for logging/tracing/metrics via subclassing; `WorkerPoolBuilder` fluent builder; `getSignal()` transparency getter; `WorkerEnvelopeType` and `WorkerPoolConfigType` exported types.
