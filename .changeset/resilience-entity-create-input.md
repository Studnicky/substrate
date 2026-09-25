---
"@studnicky/resilience": major
---

`CircuitBreakerClosedStateEntity.create`, `CircuitBreakerHalfOpenStateEntity.create`, `CircuitBreakerMachineOptionsEntity.create`, `DeadLetterQueueEntryMetadataEntity.create`, and `RateLimitConsumptionEntity.create` accept their respective `InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`/`minLength`/`exclusiveMinimum`-constrained `Type`, which no caller outside the compiler could construct.
