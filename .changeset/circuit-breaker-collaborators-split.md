---
"@studnicky/resilience": major
---

`CircuitBreaker.create` and its protected constructor take `(config: unknown, collaborators: CircuitBreakerCollaboratorsInterface = {})` instead of a single pre-typed options object. `failureThreshold`/`resetTimeoutMs`/`successThreshold`/`name` go through `CircuitBreakerOptionsEntity.intake`, which now actually runs — the constructor previously hand-rolled `failureThreshold < 1`/`resetTimeoutMs < 0` checks duplicating constraints the schema already declared and never validated `successThreshold`, `name`, or unknown properties at all. `clock` and `errorClassifier` are typed collaborators passed separately. `CircuitBreakerOptionsInterface` is replaced by `CircuitBreakerCollaboratorsInterface`, which carries only `clock` and `errorClassifier`.
