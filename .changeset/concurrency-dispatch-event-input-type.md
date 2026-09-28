---
"@studnicky/concurrency": patch
---

`DispatchStartedEventEntity`/`DispatchCompletedEventEntity` gain `InputType`, threaded through `create`'s second type parameter. Neither is constructed via `.create()` — both are referenced as `EventBus` topic-map payload types in `boundedDispatcherComposition.ts`'s example. `EventBus.publish()` performs no runtime validation of its payload, so nothing in the path can brand a value; the example's topic map now references `.InputType` for both entries instead of the branded `.Type`, matching the guarantee `publish()` can actually supply.
