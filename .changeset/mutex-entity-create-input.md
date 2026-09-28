---
"@studnicky/mutex": major
---

`AbortResultEntity.create`, `LockMetricsEntity.create`, and `MutexQueueEntryEntity.create` accept their respective `InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`-constrained `Type`, which no caller outside the compiler could construct.
