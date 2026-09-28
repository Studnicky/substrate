---
"@studnicky/bounded-dispatcher": major
---

`BoundedDispatcherConfigInterface`'s `bus`/`semaphore` fields reference `BusQueueOptionsEntity.InputType`/`SemaphoreOptionsEntity.InputType` instead of the branded `.Type` — both are forwarded straight into `EventBus.create`/`Semaphore.create`, which already earn the brand from `InputType` internally.
