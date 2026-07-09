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

## Try it

The builder demo constructs a `Mutex` via `Mutex.builder().withTimeout().withMaxQueueSize().build()`. Watch the stats output — `maxQueueSize` and `timeout` reflect the values set on the builder, and `totalExecuted` increments with every `runExclusive` call.

<RunnableExample src="packages/mutex/examples/builderMutex" title="Mutex builder" />

The hooks demo subclasses `Mutex` and overrides eight protected lifecycle methods. Observe the trace: `beforeAcquire` fires for every caller regardless of contention; `onContended` fires only for the queued waiter; `onAcquireWait` fires only after the waiter acquires through the queue; and `onQueueDrain` fires once the key's queue empties.

<RunnableExample src="packages/mutex/examples/observedMutex" title="Mutex lifecycle hooks" />

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/mutex` | `Mutex`, `MutexBuilder`, errors, interfaces |
| `@studnicky/mutex/constants` | Default configuration constants |
| `@studnicky/mutex/errors` | `ConfigurationError`, `LockTimeoutError`, `QueueSizeExceededError` |
| `@studnicky/mutex/interfaces` | `MutexInterface`, `MutexConfigInterface`, `MutexStatsInterface`, `MutexObservabilityInterface` |

## Observability hooks

Subclass `Mutex` and override any protected hook to inject trace logging, metrics, or side-effects at the exact stage where they are needed. Hooks should stay fast and non-blocking; observer-hook failures are contained by the base class so lock acquisition and release semantics still win.

| Hook | When it fires | Args |
|------|--------------|------|
| `beforeAcquire(key)` | Before any acquisition attempt (immediate or queued) | `key: K` |
| `afterAcquire(key, waitTimeMs)` | After lock is granted (both immediate and queued paths) | `key: K`, `waitTimeMs: number` |
| `onAcquireWait(key, waitTimeMs)` | After a queued waiter finally acquires the lock (never fires for immediate grants) | `key: K`, `waitTimeMs: number` |
| `onContended(key, queueSize)` | When a caller finds the lock held and enqueues itself | `key: K`, `queueSize: number` (depth before enqueue) |
| `onRelease(key)` | On every lock release by its holder, before any handoff or drop | `key: K` |
| `beforeRelease(key, holdTimeMs)` | Before a lock is released, with hold time | `key: K`, `holdTimeMs: number` |
| `afterRelease(key)` | After the lock is dropped completely (no waiters remained) | `key: K` |
| `onQueueDrain(key)` | When the last waiter for a key leaves the queue (by acquiring or timing out) | `key: K` |
| `onTimeout(key, timeoutMs)` | When a queued acquisition exceeds the configured timeout | `key: K`, `timeoutMs: number` |
| `onEnterKey(key, to, from)` | On every per-key FSM state transition | `key: K`, `to: MutexKeyStateType`, `from: MutexKeyStateType` |

<<< ../../packages/mutex/examples/observedMutex.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/mutex)
