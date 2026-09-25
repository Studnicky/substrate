---
"@studnicky/visible-range": major
---

`VisibleRangeResolvedConfigEntity.create` accepts `VisibleRangeResolvedConfigEntity.InputType` — a plain, unbranded literal — instead of demanding the branded `exclusiveMinimum`/`minimum`-constrained `Type`, which no caller outside the compiler could construct.
