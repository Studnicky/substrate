---
"@studnicky/pipeline": major
---

### Changed

- The package root is the sole code entrypoint for `Pipeline` and its package-owned entity, error, and contracts.
- `PipelineOptionsEntity.Type` is the schema-derived configuration data. `PipelineFunctionInterface<T>` and `PipelineInterface<T>` define the callable and runtime contracts exported from the package root.

### Added

- `Pipeline.create<T>(options?)` is the single validated construction path.
- `Pipeline` has a protected constructor, preserving subclassability and `new this()` in `create()`.
