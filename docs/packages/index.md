---
title: Packages
description: Workspace packages in the @studnicky/substrate monorepo.
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
| [@studnicky/virtual-fs](/packages/virtual-fs) | In-memory synchronous filesystem primitive with browser compatibility |
| [@studnicky/signal](/packages/signal) | AbortSignal composition utilities |
| [@studnicky/idempotency-guard](/packages/idempotency-guard) | Idempotency key guard composing cache, concurrency, and json: replay, coalesce, and conflict detection |
| [@studnicky/memoize](/packages/memoize) | Pure function memoization composing cache and concurrency: LRU+TTL result caching with in-flight call dedup |
| [@studnicky/bounded-dispatcher](/packages/bounded-dispatcher) | Bounded work dispatch pattern composing concurrency's Semaphore, event-bus, and scheduler |
| [@studnicky/keyed-work-gate](/packages/keyed-work-gate) | Keyed single-flight and serialized work gate composing mutex and concurrency's Coalesce |
| [@studnicky/keyed-rate-limiter](/packages/keyed-rate-limiter) | Per-key rate limiting composing cache and resilience, generic over an injectable rate-limiting strategy |

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
| [@studnicky/paginator](/packages/paginator) | Cursor/page-list state tracker for paginated data sources |
| [@studnicky/process-kit](/packages/process-kit) | Reducer-with-effects process pattern composing fsm, scheduler, and signal |
| [@studnicky/visible-range](/packages/visible-range) | Pure index/offset arithmetic for computing the visible item range of a virtualized list |
| [@studnicky/flag-evaluator](/packages/flag-evaluator) | Local deterministic feature-flag evaluation with percentage rollout and observability hooks |

## Data

| Package | Description |
|---------|-------------|
| [@studnicky/cache](/packages/cache) | LRU cache with optional TTL and capacity bounds |
| [@studnicky/entity-store](/packages/entity-store) | Normalized, ID-indexed entity collection with CRUD operations and O(1) lookup |
| [@studnicky/json](/packages/json) | JSON/object value-tools: deep merge, clone, equal, freeze, patch, hash, path, sort |
| [@studnicky/predicates](/packages/predicates) | Type-safe predicates and coercion utilities |
| [@studnicky/types](/packages/types) | Shared zero-runtime utility types and type-guard helpers |
| [@studnicky/config](/packages/config) | Configuration validation utilities and type guards |

## I/O & Observability

| Package | Description |
|---------|-------------|
| [@studnicky/event-bus](/packages/event-bus) | Publish/subscribe event bus with backpressure-aware queues |
| [@studnicky/fetch](/packages/fetch) | Professional HTTP client with timeout, override hooks, and configured clients |
| [@studnicky/logger](/packages/logger) | Pluggable logging interface with Pino wrapper, child loggers, and structured builders |
| [@studnicky/errors](/packages/errors) | Standardized error hierarchy with cause-chain serialization and error codes |
| [@studnicky/request-executor](/packages/request-executor) | Composes fetch, retry, signal, timing, and context into a one-shot request execution pattern |
| [@studnicky/resilience](/packages/resilience) | Circuit breaker, token bucket, and dead-letter queue primitives |
| [@studnicky/sliding-window-limiter](/packages/sliding-window-limiter) | Sliding-window rate limiter — exact timestamp-log or approximate blended-counter algorithm |
| [@studnicky/boundary-kit](/packages/boundary-kit) | Composes throttle, circuit breaker, and retry into a fixed-order boundary call pattern |
| [@studnicky/health-registry](/packages/health-registry) | Named async health-check registry with worst-status-wins aggregation |
| [@studnicky/system](/packages/system) | CPU/GPU/memory/platform detection for worker sizing |
| [@studnicky/worker-pool](/packages/worker-pool) | Bounded node:worker_threads pool that fans work items across workers with a typed message envelope and per-task timeout |

## Buffers

| Package | Description |
|---------|-------------|
| [@studnicky/circular-buffer](/packages/circular-buffer) | Generic circular buffer with O(1) push and shift |
| [@studnicky/sample-buffer](/packages/sample-buffer) | Fixed-capacity numeric sample buffer with percentile calculation |

## Foundation

| Package | Description |
|---------|-------------|
| [@studnicky/eslint-config](/packages/eslint-config) | Shared ESLint flat config for `@studnicky` packages |
