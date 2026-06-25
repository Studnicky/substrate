---
title: Packages
description: All 27 packages in the @studnicky/substrate monorepo.
---

# Packages

All packages are published under the `@studnicky` scope to the GitHub Package Registry.

```
@studnicky:registry=https://npm.pkg.github.com
```

## Concurrency

| Package | Description |
|---------|-------------|
| [@studnicky/retry](/packages/retry) | Generic async retry with extensible error classification and backoff strategies |
| [@studnicky/throttle](/packages/throttle) | Sliding-window concurrency throttle with adaptive limits and abort support |
| [@studnicky/mutex](/packages/mutex) | Key-based async mutual exclusion with queue and timeout support |
| [@studnicky/batch](/packages/batch) | Batch concurrent execution: process items in controlled parallel groups |
| [@studnicky/concurrency](/packages/concurrency) | Keyed async channels, semaphore, and coalesce primitives |
| [@studnicky/file-lock](/packages/file-lock) | Process-level advisory file locking |
| [@studnicky/signal](/packages/signal) | AbortSignal composition utilities |

## Time

| Package | Description |
|---------|-------------|
| [@studnicky/clock](/packages/clock) | Wall-clock and monotonic time with injectable providers for deterministic testing |
| [@studnicky/scheduler](/packages/scheduler) | Real-time and virtual (min-heap) scheduler primitives |
| [@studnicky/timing](/packages/timing) | High-resolution operation timing tracker using `process.hrtime.bigint()` |

## State & Flow

| Package | Description |
|---------|-------------|
| [@studnicky/context](/packages/context) | Per-request async context isolation using `AsyncLocalStorage` |
| [@studnicky/fsm](/packages/fsm) | Abstract finite state machine base class with effect interpreter |
| [@studnicky/pipeline](/packages/pipeline) | Generic typed async pipeline for sequential context transforms |

## Data

| Package | Description |
|---------|-------------|
| [@studnicky/cache](/packages/cache) | LRU cache with optional TTL and capacity bounds |
| [@studnicky/json](/packages/json) | JSON/object value-tools: deep merge, clone, equal, freeze, patch, hash, path, sort |
| [@studnicky/predicates](/packages/predicates) | Type-safe predicates and coercion utilities |
| [@studnicky/types](/packages/types) | Shared zero-runtime utility types and type-guard helpers |
| [@studnicky/config](/packages/config) | Configuration validation utilities and type guards |

## I/O & Observability

| Package | Description |
|---------|-------------|
| [@studnicky/event-bus](/packages/event-bus) | Publish/subscribe event bus with backpressure-aware queues |
| [@studnicky/fetch](/packages/fetch) | Professional HTTP client with timeout, interceptors, and configured clients |
| [@studnicky/logger](/packages/logger) | Pluggable logging interface with Pino wrapper, child loggers, and structured builders |
| [@studnicky/errors](/packages/errors) | Standardized error hierarchy with cause-chain serialization and error codes |
| [@studnicky/resilience](/packages/resilience) | Circuit breaker, token bucket, and dead-letter queue primitives |
| [@studnicky/system](/packages/system) | CPU/GPU/memory/platform detection for worker sizing |

## Buffers

| Package | Description |
|---------|-------------|
| [@studnicky/circular-buffer](/packages/circular-buffer) | Generic circular buffer with O(1) push and shift |
| [@studnicky/sample-buffer](/packages/sample-buffer) | Fixed-capacity numeric sample buffer with percentile calculation |

## Foundation

| Package | Description |
|---------|-------------|
| [@studnicky/eslint-config](/packages/eslint-config) | Shared ESLint flat config for `@studnicky` packages |
