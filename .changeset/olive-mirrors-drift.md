---
"@studnicky/pipeline": major
---

`Pipeline`'s stage list is fixed at construction: `Pipeline.create<T>(stages, options?)` takes the ordered transform-function array as its first argument, and stage composition no longer changes after construction. `add(fn)` and `clear()` are removed — build a new `Pipeline` for a different stage list instead of mutating an existing one. This closes the one remaining interceptor-shaped extensibility path in the package (a runtime-registered function array threaded through `run()`, including mid-run self-removal); the protected lifecycle hooks (`onRunStart`, `beforeStage`, `onStageStart`, `onStageSuccess`, `afterStage`, `onStageError`, `onRunError`, `onRunComplete`) are unchanged.
