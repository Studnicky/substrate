# Changelog

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/signal@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors use `@studnicky/errors`'s `DomainErrorArgs.build()`. Fluent builders assemble options through `@studnicky/types`'s `PickDefined.from()`. `@studnicky/fetch` config validators subclass `@studnicky/config`'s `ConfigValidation`. Shared ESLint rule AST helpers reside under `@studnicky/eslint-config`'s `rules/shared/`.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0
  - @studnicky/signal@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `CircuitBreaker.reset()` is the single operation that restores the closed state.
- `@studnicky/resilience` is the sole public code entrypoint.

### Added

- `CircuitBreaker.create(options)`, `DeadLetterQueue.create(options)`, `TokenBucket.create(options)`, and `DeadLetterQueueRetryGenerator.create(options)` construct instances through protected constructors.
- Entity declarations use direct `JSONSchema` and `FromSchema` imports from `json-schema-to-ts` and direct `ValidateFunction` imports from `ajv`.
- `CircuitBreaker`, `DeadLetterQueue`, `DeadLetterQueueRetryGenerator`, and `TokenBucket` compose instance-local `HookInvoker` objects as the sole owners of hook-failure diagnostics. The primitives retain their swallow disposition without duplicate owner storage or public diagnostic facades.

## [1.0.0] - 2026-06-22

### Added

- `CircuitBreaker` with closed/open/halfOpen state machine, injectable clock, configurable `failureThreshold`, `resetTimeoutMs`, and `successThreshold`. `CircuitBreakerOpenError` thrown when the circuit is open.
- `TokenBucket` rate limiter with `consume()` (throws `TokenBucketExhaustedError` when exhausted) and `waitForToken()` async variant with `AbortSignal` support. Injectable clock for deterministic testing.
- `DeadLetterQueue` bounded FIFO queue with async-generator `drain()`, `close()`, `abort()`, and `AbortSignal` integration. `DlqFullError`, `DlqClosedError`, and `DlqAbortedError` for failure cases.
- `DeadLetterQueueRetryGenerator` wraps a `DeadLetterQueue` and re-yields entries at a configurable `intervalMs`.
