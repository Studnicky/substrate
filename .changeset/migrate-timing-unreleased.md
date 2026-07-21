---
"@studnicky/timing": major
---

`Timing.create(options?)` and `NoOpTiming.create()` are the only public construction paths for timing trackers. `TimingEvent.create(config)` creates frozen event data in one step from required `component` and `operation` fields plus optional `status`. Time units and timing statuses are exported as `TimeUnitEntity.Type` and `TimingStatusEntity.Type`; event and runtime contracts are interfaces. `@studnicky/timing` is the sole public code entrypoint and exports `TimingInterface`.
