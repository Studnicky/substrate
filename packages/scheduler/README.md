# @studnicky/scheduler

> Scheduler primitives — real-time (setTimeout/setInterval) and virtual (min-heap, deterministic) implementations

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/scheduler)

`@studnicky/scheduler` provides two scheduler implementations behind a common `SchedulerProviderInterface`: `RealTimeScheduler` for production use and `VirtualScheduler` for deterministic, time-controlled testing without real timers.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/scheduler
```

## Usage

### Virtual scheduler (testing)

```ts
import { VirtualScheduler } from '@studnicky/scheduler';
import { VirtualTimeCounter } from '@studnicky/clock';

const counter = VirtualTimeCounter.create({ startMs: 0 });
const scheduler = VirtualScheduler.create({ counter });

const fired: number[] = [];

scheduler.scheduleAt(100, () => { fired.push(100); });
scheduler.scheduleAt(200, () => { fired.push(200); });

scheduler.advance(150);
// fired → [100]

scheduler.advance(100);
// fired → [100, 200]
```

Pass the same `VirtualTimeCounter` instance to `VirtualClockProvider` when you need `Clock.now()` to stay in sync with scheduled task fires.

### Real-time scheduler (production)

```ts
import { RealTimeScheduler } from '@studnicky/scheduler';

const scheduler = RealTimeScheduler.create();

const task = scheduler.scheduleAt(Date.now() + 1000, () => {
  console.log('fired after 1 s');
});

// Cancel before it fires:
task.cancel();

// Or cancel everything:
scheduler.cancelAll();
```

### Delay

`Delay.sleep(ms, { clock?, scheduler?, signal? })` is the scheduler-aware sleep API. `clock` and `scheduler` default to real-time providers; tests can inject a `VirtualScheduler` + `VirtualClockProvider` pair sharing a `VirtualTimeCounter` to resolve deterministically as virtual time advances. A native `AbortSignal` makes a pre-aborted call reject with its exact `signal.reason` without scheduling, or cancels a pending scheduled task and rejects with that same reason.

```ts
import { Delay } from '@studnicky/scheduler';

// Real time — resolves after ~1s of wall-clock time.
await Delay.sleep(1000);

// Resolves with a value after the delay — useful for backoff/race compositions.
await Delay.sleep(1000);
```

```ts
import { Delay } from '@studnicky/scheduler';

const controller = new AbortController();
const reason = new Error('request cancelled');
const sleeping = Delay.sleep(1000, { signal: controller.signal });

controller.abort(reason);

try {
  await sleeping;
} catch (error) {
  console.log(error === reason); // true
}
```

```ts
import { Delay, VirtualScheduler } from '@studnicky/scheduler';
import { VirtualClockProvider, VirtualTimeCounter } from '@studnicky/clock';

const counter = VirtualTimeCounter.create({ startMs: 0 });
const scheduler = VirtualScheduler.create({ counter });
const clock = VirtualClockProvider.create(counter);

const promise = Delay.sleep(1000, { scheduler, clock });

scheduler.advance(1000);
await promise; // resolves with no real wall-clock wait
```

Passing `signal` in the same options object keeps cancellation deterministic too: aborting cancels the virtual scheduled task, and later `advance()` calls do not fire it.

## Extending

Inject either implementation via `SchedulerProviderInterface` so production and test code share the same call site:

```ts
import type { SchedulerProviderInterface } from '@studnicky/scheduler';

class TaskRunner {
  readonly #scheduler: SchedulerProviderInterface;

  public constructor(scheduler: SchedulerProviderInterface) {
    this.#scheduler = scheduler;
  }

  public enqueue(atMs: number, work: () => void): void {
    this.#scheduler.scheduleAt(atMs, work);
  }
}
```

`PendingTaskInterface` is the root-exported task record accepted and returned by the public `MinimumHeap` primitive.

`SchedulerTaskDataEntity` owns the serializable due time, interval, and timer variant fields composed by scheduler contracts. `SchedulerLogEntryEntity` owns the task identifier and lifecycle event fields used by logging schedulers.

Both classes expose protected extension seams for subclassing:

- `generateId()` — control task ID format.
- `createHeap()` (`VirtualScheduler`) / `createTimeout()`, `createInterval()`, `clearTimer()` (`RealTimeScheduler`) — substitute the underlying timer or heap backend.
- Lifecycle hooks: `onSchedule`, `onFire`, `onCancel`, `onCancelAll` (plus `onAdvance`, `onRunUntil` on `VirtualScheduler`) — attach observability without touching core logic.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/scheduler

## License

MIT
