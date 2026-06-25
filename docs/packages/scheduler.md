---
title: '@studnicky/scheduler'
description: Real-time and virtual (min-heap) scheduler primitives for deterministic testing.
---

# @studnicky/scheduler

> Scheduler primitives: real-time (setTimeout/setInterval) and virtual (min-heap, deterministic) implementations.

## Install

```bash
pnpm add @studnicky/scheduler
```

## Usage

### Virtual scheduler (deterministic)

Schedule one-shot tasks at specific virtual timestamps and advance time in steps. Only tasks due at or before the advanced time are fired:

<<< ../../packages/scheduler/examples/virtual-scheduler.ts#usage

### Interval tasks and cancellation

Use `scheduleEvery` for repeating tasks and `cancelAll` to stop all pending tasks:

<<< ../../packages/scheduler/examples/interval-tasks.ts#usage

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/scheduler` | `RealTimeScheduler`, `VirtualScheduler` |
| `@studnicky/scheduler/interfaces` | `SchedulerProviderType`, `ScheduledTaskType` |

## Extending

Both schedulers expose protected hooks for every lifecycle event. The `di-provider` example demonstrates the injectable `SchedulerProviderType` pattern with a `LoggingScheduler` subclass that records `schedule` and `fire` events:

<<< ../../packages/scheduler/examples/di-provider.ts#usage

## Observability hooks

Both `VirtualScheduler` and `RealTimeScheduler` expose the same set of protected lifecycle hooks. Override any of them in a subclass to add logging, metrics, or alerting without coupling the scheduler to any external library.

### VirtualScheduler hooks

| Hook | When it fires | Args |
|------|---------------|------|
| `onSchedule(id, atMs, variant)` | After a task is inserted into the heap via `scheduleAt` or `scheduleEvery` | `id: string`, `atMs: number`, `variant: 'timeout' \| 'interval'` |
| `onAdvance(deltaMs)` | At the start of `advance()`, before the counter is incremented | `deltaMs: number` |
| `onRunUntil(atMs)` | At the start of `runUntil()` | `atMs: number` |
| `onFire(id)` | Immediately before a task's `fire` callback is invoked | `id: string` |
| `onFireError(id, error)` | When a task's `fire` callback throws synchronously or returns a rejected Promise | `id: string`, `error: unknown` |
| `onReschedule(id, atMs)` | After an interval task is re-inserted into the heap following a successful fire | `id: string`, `atMs: number` (next scheduled time) |
| `onCancel(id)` | When a task's `cancel()` method is invoked | `id: string` |
| `onCancelAll()` | At the end of `cancelAll()` | — |
| `onIdle()` | After `runUntil` / `runAll` drains the heap, or after `cancelAll` | — |

### RealTimeScheduler hooks

| Hook | When it fires | Args |
|------|---------------|------|
| `onSchedule(id, atMs, variant)` | After a task is registered via `scheduleAt` or `scheduleEvery` | `id: string`, `atMs: number`, `variant: 'timeout' \| 'interval'` |
| `onFire(id)` | Inside the timer callback, immediately before `fire` is invoked | `id: string` |
| `onFireError(id, error)` | When a task's `fire` callback throws synchronously or returns a rejected Promise | `id: string`, `error: unknown` |
| `onDrift(id, dueMs, actualMs, driftMs)` | When a one-shot task fires later than its scheduled `atMs` | `id: string`, `dueMs: number`, `actualMs: number`, `driftMs: number` |
| `onMiss(id, atMs, nowMs)` | When `scheduleAt` receives an `atMs` already in the past | `id: string`, `atMs: number`, `nowMs: number` |
| `onCancel(id)` | When a task's `cancel()` method is invoked | `id: string` |
| `onCancelAll()` | At the end of `cancelAll()`, after all timers are cleared | — |
| `onIdle()` | After `cancelAll` fully drains all tracked tasks | — |

### Demo trace (virtual scheduler)

<<< ../../packages/scheduler/examples/observedScheduler.ts#usage

The base class never calls any logger or metrics library. All hooks are no-ops by default.

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/scheduler)
