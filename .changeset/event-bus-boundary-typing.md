---
"@studnicky/event-bus": major
---

`BusQueueCreateOptionsInterface` (`BusQueue.create`'s public parameter) references `BusQueueOptionsEntity.InputType` instead of the branded `.Type`; `BusQueueOptionsEntity` gains `InputType`, threaded through `create`'s second type parameter. `EventBus.create`'s `config` parameter and the protected constructor's `config` parameter both reference `BusQueueOptionsEntity.InputType`. The constructor never validated its config at all — it forwarded the raw value straight into `Object.freeze(structuredClone(...))` beside a compiled validator that was never called. It now `intake`s the config, throwing the existing `BusQueueConfigError` on invalid input.
