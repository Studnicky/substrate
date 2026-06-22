---
title: Packages
description: All 18 packages in the @studnicky/substrate monorepo.
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
| [@studnicky/batch](/packages/batch) | Batch concurrent execution — process items in controlled parallel groups |

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
| [@studnicky/pipeline](/packages/pipeline) | Generic typed async pipeline for sequential context transforms |

## Data

| Package | Description |
|---------|-------------|
| [@studnicky/json](/packages/json) | JSON/object value-tools: deep merge, clone, equal, freeze, patch, hash, path, sort |
| [@studnicky/types](/packages/types) | Shared zero-runtime utility types and type-guard helpers |
| [@studnicky/config](/packages/config) | Configuration validation utilities and type guards |

## I/O & Observability

| Package | Description |
|---------|-------------|
| [@studnicky/fetch](/packages/fetch) | Professional HTTP client with timeout, interceptors, and configured clients |
| [@studnicky/logger](/packages/logger) | Pluggable logging interface with Pino wrapper, child loggers, and structured builders |
| [@studnicky/errors](/packages/errors) | Standardized error hierarchy with cause-chain serialization and error codes |

## Buffers

| Package | Description |
|---------|-------------|
| [@studnicky/circular-buffer](/packages/circular-buffer) | Generic circular buffer with O(1) push and shift |
| [@studnicky/sample-buffer](/packages/sample-buffer) | Fixed-capacity numeric sample buffer with percentile calculation |

## Foundation

| Package | Description |
|---------|-------------|
| [@studnicky/eslint-config](/packages/eslint-config) | Shared ESLint 9 flat config for `@studnicky` packages |
