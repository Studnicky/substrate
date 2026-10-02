# Changelog

## 15.0.0

### Patch Changes

- 94f3657: `RealTimeClockProviderOptionsEntity`, `CancellableTaskTransitionEventEntity`, `WorkerLogEnvelopeEntity`, `LruCacheOptionsEntity`, `MkdirOptionsEntity`, `SchedulerTaskDataEntity`, `MutexStatsEntity`, `VectorSearchOptionsEntity`, `QueryParametersEntity`, `CpuInfoEntity`, `PaginatorHasMoreStateEntity`, and `SemaphoreGrantStateEntity` gain `InputType`, threaded through `create`'s second type parameter. Each entity's own `create()` previously demanded already-branded input, because `EntityCreateFunctionInterface<TStatic, TInput = TStatic>` defaults `TInput` to the branded type when only one type argument is given.
- 24a8a46: `VectorIndexInterface.search`'s `options` parameter references `VectorSearchOptionsEntity.InputType` instead of the branded `.Type` — a public method demanding a caller supply already-branded data, which no caller can do. `limit`/`namespace` carry no numeric/string constraint, so `.Type` and `.InputType` are structurally identical for this entity; no caller's behavior changes.
- Updated dependencies [cf88dc6]
- Updated dependencies [91ca066]
- Updated dependencies [f66779c]
- Updated dependencies [0efeecf]
- Updated dependencies [a664914]
- Updated dependencies [3998901]
- Updated dependencies [91ca066]
- Updated dependencies [6c5051a]
- Updated dependencies [966e1a8]
- Updated dependencies [ebd9f1c]
- Updated dependencies [bb7bb62]
- Updated dependencies [4d24d54]
- Updated dependencies [c91c4eb]
- Updated dependencies [b554549]
- Updated dependencies
- Updated dependencies [1402570]
- Updated dependencies [f820efa]
- Updated dependencies [8e6a261]
- Updated dependencies [1eac93c]
- Updated dependencies [2831589]
- Updated dependencies [5681045]
- Updated dependencies [3da660e]
- Updated dependencies [543de66]
- Updated dependencies [79e33e6]
- Updated dependencies [5374a59]
  - @studnicky/types@15.0.0
  - @studnicky/errors@15.0.0
  - @studnicky/entity@15.0.0

## 14.0.0

### Patch Changes

- Updated dependencies [4d4555f]
  - @studnicky/types@14.0.0
  - @studnicky/entity@14.0.0
  - @studnicky/errors@14.0.0

## 13.0.0

### Patch Changes

- Updated dependencies [95c7c69]
- Updated dependencies [95c7c69]
  - @studnicky/errors@13.0.0
  - @studnicky/entity@13.0.0
  - @studnicky/types@13.0.0

## 12.2.0

### Patch Changes

- @studnicky/errors@12.2.0
  - @studnicky/types@12.2.0

## 12.1.1

### Patch Changes

- @studnicky/errors@12.1.1
  - @studnicky/types@12.1.1

## 12.1.0

### Patch Changes

- Updated dependencies [aa12145]
  - @studnicky/types@12.1.0
  - @studnicky/errors@12.1.0

## 12.0.1

### Patch Changes

- Updated dependencies [ae381ef]
  - @studnicky/types@12.0.1
  - @studnicky/errors@12.0.1

## 12.0.0

### Patch Changes

- Updated dependencies [46e9a40]
  - @studnicky/errors@12.0.0
  - @studnicky/types@12.0.0

## 11.1.0

### Minor Changes

- `@studnicky/semantic-matching` provides provider-neutral contracts for vector and model-assisted matching primitives.
