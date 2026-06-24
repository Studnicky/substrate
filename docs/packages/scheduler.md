---
title: '@studnicky/scheduler'
description: Real-time and virtual (min-heap) scheduler primitives for deterministic testing.
---

# @studnicky/scheduler

> Scheduler primitives — real-time (setTimeout/setInterval) and virtual (min-heap, deterministic) implementations.

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

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/scheduler)
