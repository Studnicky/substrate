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

### Real-time scheduler

```typescript
import { RealTimeScheduler } from '@studnicky/scheduler';

const scheduler = new RealTimeScheduler();

// One-shot: fire at a specific epoch-ms
const task = scheduler.scheduleAt(Date.now() + 2000, async () => {
  console.log('fired after 2s');
});

// Repeating interval
const intervalTask = scheduler.scheduleEvery(1000, async () => {
  console.log('fires every 1s');
});

// Cancel a single task
task.cancel();

// Cancel all tasks
scheduler.cancelAll();
```

### Virtual scheduler (deterministic)

```typescript
import { VirtualScheduler } from '@studnicky/scheduler';

const scheduler = new VirtualScheduler();

scheduler.scheduleAt(100, async () => console.log('at t=100'));
scheduler.scheduleAt(200, async () => console.log('at t=200'));

// Advance virtual time — fires all tasks scheduled before the new time
await scheduler.advance(150); // fires t=100 only
await scheduler.advance(300); // fires t=200
```

## Subpath exports

| Subpath | Contents |
|---------|----------|
| `@studnicky/scheduler` | `RealTimeScheduler`, `VirtualScheduler` |
| `@studnicky/scheduler/interfaces` | `SchedulerProviderInterface`, `ScheduledTaskInterface` |

## Extending

Both schedulers expose protected hooks for every lifecycle event:

```typescript
import { RealTimeScheduler } from '@studnicky/scheduler';

class TrackedScheduler extends RealTimeScheduler {
  protected override onSchedule(id: string, atMs: number): void {
    log.debug({ id, atMs }, 'task scheduled');
  }

  protected override onFire(id: string): void {
    metrics.increment('scheduler.fired');
  }

  protected override onCancel(id: string): void {
    metrics.increment('scheduler.cancelled');
  }
}
```

[Source on GitHub](https://github.com/Studnicky/substrate/tree/main/packages/scheduler)
