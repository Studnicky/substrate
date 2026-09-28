---
"@studnicky/cache": patch
"@studnicky/clock": patch
"@studnicky/concurrency": patch
"@studnicky/fetch": patch
"@studnicky/mutex": patch
"@studnicky/paginator": patch
"@studnicky/scheduler": patch
"@studnicky/semantic-matching": patch
"@studnicky/system": patch
"@studnicky/virtual-fs": patch
"@studnicky/worker-pool": patch
---

`RealTimeClockProviderOptionsEntity`, `CancellableTaskTransitionEventEntity`, `WorkerLogEnvelopeEntity`, `LruCacheOptionsEntity`, `MkdirOptionsEntity`, `SchedulerTaskDataEntity`, `MutexStatsEntity`, `VectorSearchOptionsEntity`, `QueryParametersEntity`, `CpuInfoEntity`, `PaginatorHasMoreStateEntity`, and `SemaphoreGrantStateEntity` gain `InputType`, threaded through `create`'s second type parameter. Each entity's own `create()` previously demanded already-branded input, because `EntityCreateFunctionInterface<TStatic, TInput = TStatic>` defaults `TInput` to the branded type when only one type argument is given.
