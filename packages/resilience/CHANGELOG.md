# Changelog

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
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

### Added

- `CircuitBreaker.create(options)` factory and `CircuitBreaker.builder()` fluent builder with `withFailureThreshold()`, `withResetTimeoutMs()`, `withSuccessThreshold()`, `withName()`, `withClock()`. Constructor is now `protected`.
- `DeadLetterQueue.create(options)` factory and `DeadLetterQueue.builder()` fluent builder with `withCapacity()`, `withClock()`, `withSignal()`. Constructor is now `protected`.
- `TokenBucket.create(options)` factory and `TokenBucket.builder()` fluent builder with `withRequestsPerSecond()`, `withBurstSize()`, `withClock()`. Constructor is now `protected`.
- `DeadLetterQueueRetryGenerator.create(options)` factory accepting `{ dlq, intervalMs }` and `DeadLetterQueueRetryGenerator.builder()` fluent builder with `withDlq()`, `withIntervalMs()`. Constructor is now `protected`.
- `CircuitBreakerBuilder`, `DeadLetterQueueBuilder`, `TokenBucketBuilder`, `DeadLetterQueueRetryGeneratorBuilder` exported from the package index.

## [1.0.0] - 2026-06-22

### Added

- `CircuitBreaker` with closed/open/halfOpen state machine, injectable clock, configurable `failureThreshold`, `resetTimeoutMs`, and `successThreshold`. `CircuitBreakerOpenError` thrown when the circuit is open.
- `TokenBucket` rate limiter with `consume()` (throws `TokenBucketExhaustedError` when exhausted) and `waitForToken()` async variant with `AbortSignal` support. Injectable clock for deterministic testing.
- `DeadLetterQueue` bounded FIFO queue with async-generator `drain()`, `close()`, `abort()`, and `AbortSignal` integration. `DlqFullError`, `DlqClosedError`, and `DlqAbortedError` for failure cases.
- `DeadLetterQueueRetryGenerator` wraps a `DeadLetterQueue` and re-yields entries at a configurable `intervalMs`.
