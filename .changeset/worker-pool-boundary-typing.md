---
"@studnicky/worker-pool": major
---

`WorkerPoolConfigInterface` (`WorkerPool.create`'s public parameter) references `WorkerPoolConfigEntity.InputType` instead of the branded `.Type`; `WorkerPoolConfigEntity` gains `InputType`, threaded through `create`'s second type parameter — it previously demanded already-branded input.

Internally computed array positions and worker ids earn their brand via a positive `validate()` guard before entering a `WorkerTaskIndexEntity`-typed field, rather than being assigned as plain numbers.
