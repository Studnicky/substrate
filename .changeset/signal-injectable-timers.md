---
"@studnicky/signal": minor
---

`RaceTimeout.wait()` and `Signal.compose()`'s deadline timeout now accept optional `clock` and `scheduler` options (`ClockProviderInterface` / `SchedulerProviderInterface` from `@studnicky/clock` and `@studnicky/scheduler`), defaulting to `RealTimeClockProvider` and `RealTimeScheduler` so no existing caller changes. `RaceTimeout.wait()` delegates to `@studnicky/scheduler`'s `Delay.sleep()` instead of a hand-rolled `setTimeout`/`clearTimeout` pair. Tests can now pass a `VirtualClockProvider` + `VirtualScheduler` pair sharing one `VirtualTimeCounter` to drive both deterministically instead of racing real timers.
