---
title: '@studnicky/mutex'
description: Key-based async mutual exclusion with queue and timeout support.
---

# @studnicky/mutex

> Key-based async mutex for preventing race conditions in concurrent operations.

## Install

```bash
pnpm add @studnicky/mutex
```

## Usage

Acquire a lock on a named key with `runExclusive`. Different keys run concurrently; the same key serializes:

<<< ../../packages/mutex/examples/keyedMutex.ts#usage

## Manual acquire/release

Use `acquire()` when you need explicit try/finally control, or `acquireDisposable()` for a releaseable handle:

<<< ../../packages/mutex/examples/acquireRelease.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/mutex` | `Mutex`, `MutexBuilder`, errors, interfaces |
| `@studnicky/mutex/constants` | Default configuration constants |
| `@studnicky/mutex/errors` | `ConfigurationError`, `LockTimeoutError`, `QueueSizeExceededError` |
| `@studnicky/mutex/interfaces` | `MutexInterface`, `MutexConfigInterface`, `MutexStatsInterface`, `MutexObservabilityInterface` |

## Extending

Subclass `Mutex` and override `afterAcquire` and `beforeRelease` to collect timing telemetry without coupling the mutex core to any metrics library:

<<< ../../packages/mutex/examples/observedMutex.ts#usage

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/mutex)
