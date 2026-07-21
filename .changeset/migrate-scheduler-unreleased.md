---
"@studnicky/scheduler": major
---

`Delay.sleep(ms, { clock?, scheduler?, signal? })` resolves after a scheduler-aware delay. A native `AbortSignal` rejects with its exact reason, schedules nothing when already aborted, and cancels a pending scheduled task on later abort.

The package root is the sole public code entrypoint and includes `PendingTaskInterface`, `ScheduledTaskInterface`, and `SchedulerProviderInterface` alongside scheduler behavior. `MinimumHeap`, `RealTimeScheduler`, and `VirtualScheduler` use `Class.create(...)`; their constructors are protected. `VirtualScheduler.create({ counter })` accepts an options object, and the constructor validates the injected counter and throws `SchedulerError` if missing.
