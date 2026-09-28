---
"@studnicky/errors": major
---

`ProblemDetailsEntity.create`, `ThrownValueEntity.create`, and `ValidationReportOptionsEntity.create` accept their respective `InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`/`maximum`/`maxItems`-constrained `Type`, which no caller outside the compiler could construct.
