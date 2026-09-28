---
"@studnicky/worker-pool": major
---

`WorkerProgressEnvelopeEntity.create` and `WorkerTaskIndexEntity.create` accept their respective `InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`/`maximum`-constrained `Type`, which no caller outside the compiler could construct.
