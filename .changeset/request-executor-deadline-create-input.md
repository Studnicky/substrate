---
"@studnicky/request-executor": major
---

`RequestDeadlineEntity.create` accepts `RequestDeadlineEntity.InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`-constrained `Type`, which no caller outside the compiler could construct.
