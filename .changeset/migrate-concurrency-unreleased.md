---
"@studnicky/concurrency": major
---

### Changed

- The package root is the sole code entrypoint for `AsyncIter`, `Channel`, `Coalesce`, `Semaphore`, their option entities, and package errors.
- `Channel.create(options?)`, `Coalesce.create(options?)`, and `Semaphore.create(options)` are the sole construction entry points; constructors are protected.
- `Semaphore.create()` accepts the schema-validated `SemaphoreOptionsEntity.Type` options object `{ permits }`.
