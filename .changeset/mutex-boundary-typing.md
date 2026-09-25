---
"@studnicky/mutex": major
---

`MutexCreateOptionsInterface` (`Mutex.create`'s public parameter) references `Partial<MutexConfigEntity.InputType>` instead of the branded `.Type`; `MutexConfigEntity` gains `InputType`, threaded through `create`'s second type parameter — it previously demanded already-branded input. `configInternal.ConfigValidator.validate`'s own parameter is `unknown`, matching the `intake` call it forwards to one line later.

Internally computed values (`acquiredAt`/`queuedAt` clock readings, `getStats()`'s counters) earn their brand via a positive `validate()` guard before entering `LockMetricsEntity`/`MutexQueueEntryEntity`/`MutexStatsEntity`-typed fields, rather than being assigned as plain numbers.
