---
"@studnicky/circular-buffer": major
---

`CircularBufferStateEntity.create` accepts `CircularBufferStateEntity.InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`-constrained `Type`, which no caller outside the compiler could construct.
