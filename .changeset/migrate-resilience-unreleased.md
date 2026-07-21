---
"@studnicky/resilience": major
---

### Changed

- `CircuitBreaker.reset()` is the single operation that restores the closed state.
- `@studnicky/resilience` is the sole public code entrypoint.

### Added

- `CircuitBreaker.create(options)`, `DeadLetterQueue.create(options)`, `TokenBucket.create(options)`, and `DeadLetterQueueRetryGenerator.create(options)` construct instances through protected constructors.
- Entity declarations use direct `JSONSchema` and `FromSchema` imports from `json-schema-to-ts` and direct `ValidateFunction` imports from `ajv`.
- `CircuitBreaker`, `DeadLetterQueue`, `DeadLetterQueueRetryGenerator`, and `TokenBucket` compose instance-local `HookInvoker` objects as the sole owners of hook-failure diagnostics. The primitives retain their swallow disposition without duplicate owner storage or public diagnostic facades.
