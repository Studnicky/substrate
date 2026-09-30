---
title: '@studnicky/mutex'
description: Key-based async mutual exclusion with queue and timeout support.
---

# @studnicky/mutex

> Key-based async mutex for preventing race conditions in concurrent operations.

## Northstar Books checkout coordination

Northstar Books treats a repeated checkout click and an inventory reservation as different keyed operations. `KeyedWorkGate` from `@studnicky/mutex/gate` coalesces concurrent payment submissions for one order when every caller may receive the leader result, while serialized work protects each ISBN reservation from local concurrent writes.

The guarantee is local and key-specific: one serialized operation holds a key at a time, duplicate single-flight callers share one in-flight execution, and unrelated order or ISBN keys continue concurrently. A mutex does not coordinate separate browser tabs, processes, or machines; durable cross-runtime ownership belongs to the application database, lease, or idempotency boundary.

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

## Keyed work gates

Import `KeyedWorkGate` from `@studnicky/mutex/gate` to coordinate work for a named key. `runSingleFlight` collapses concurrent calls for the same key through `Coalesce`; `runSerialized` runs every call while the mutex keeps that key exclusive.

<<< ../../packages/mutex/examples/observedKeyedWorkGate.ts#usage

<RunnableExample src="packages/mutex/examples/observedKeyedWorkGate" title="Single-flight coalescing and serialized execution for one key" />

The single-flight path enters `Coalesce` before its leader acquires the mutex, so duplicate callers join one execution while serialized work on the same key remains exclusive.

## Try it

The hooks demo subclasses `Mutex` and overrides eight protected lifecycle methods. Observe the trace: `beforeAcquire` fires for every caller regardless of contention; `onContended` fires only for the queued waiter; `onAcquireWait` fires only after the waiter acquires through the queue; and `onQueueDrain` fires once the key's queue empties.

<RunnableExample src="packages/mutex/examples/observedMutex" title="Mutex lifecycle hooks" />

## Public API

Import `Mutex` and package errors from `@studnicky/mutex/node`; import `KeyedWorkGate` from `@studnicky/mutex/gate`; import schema-backed entities from `@studnicky/mutex/entities`; and import `MutexCreateOptionsInterface`, `MutexInterface`, and `MutexLockInterface` from `@studnicky/mutex/interfaces`. Create instances directly with `Mutex.create(config?)`; implementation constants remain internal.

Pass a `ClockProviderInterface` through `clock` when application timing needs to be deterministic. Mutex uses that provider for acquisition waits and lock-hold measurements; the default is `RealTimeClockProvider`.

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
| `onEnterKey(key, to, from)` | On every per-key FSM state transition | `key: K`, `to: MutexKeyStateEntity.Type`, `from: MutexKeyStateEntity.Type` |

<<< ../../packages/mutex/examples/observedMutex.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/mutex)

## Entities

`@studnicky/mutex/entities` exports every schema namespace in `src/entities`.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import { MutexConfigEntity } from '@studnicky/mutex/entities';
```

## Interfaces

`@studnicky/mutex/interfaces` exports every TypeScript interface in `src/interfaces`, including configuration and state contracts.

<!-- inline-ts-ok: This canonical published import path cannot be transcluded from a relative-path example and is verified by check-docs-exports. -->
```typescript
import type { MutexInterface } from '@studnicky/mutex/interfaces';
```

## Exports

| Symbol | Purpose | Import path |
|---|---|---|
| `Mutex` | Provides mutex functionality. | `@studnicky/mutex/node` |
| `KeyedWorkGate` | Coordinates single-flight and serialized work for each key. | `@studnicky/mutex/gate` |
| `MutexCreateOptionsInterface` | Accepts mutex settings and the optional Clock provider. | `@studnicky/mutex/interfaces` |
| `LockTimeoutError` | Represents lock timeout failures. | `@studnicky/mutex/node` |
| `MutexAcquisitionSettledError` | Abort reason for a queued acquisition's timeout watcher once the acquisition settles. | `@studnicky/mutex/node` |
| `MutexError` | Represents mutex failures. | `@studnicky/mutex/node` |
| `QueueSizeExceededError` | Represents queue size exceeded failures. | `@studnicky/mutex/node` |
