---
"@studnicky/concurrency": major
---

`Coalesce.create`/`Channel.create`'s public `options` parameter references `CoalesceOptionsEntity.InputType`/`ChannelOptionsEntity.InputType` instead of the branded `.Type`; both entities gain `InputType`, threaded through `create`'s second type parameter. Neither `Coalesce` nor `Channel` validated their construction options at all before this — `static create()` forwarded the raw, unvalidated value straight into the protected constructor, which read `options.timeout`/`options.highWaterMark` with no check. Both now `intake` the options in `create()`, throwing the new `CoalesceConfigError`/`ChannelConfigError` on invalid input, and the constructor receives genuinely validated, branded data.

`KeyedSemaphore.create`'s `options` parameter references `SemaphoreOptionsEntity.InputType`, matching `Semaphore.create`'s already-correct signature; `SemaphoreOptionsEntity` gains the same `InputType` threading through `create`.
