---
"@studnicky/system": major
---

`GpuMetalProfileEntity.create` accepts `GpuMetalProfileEntity.InputType` — a plain, unbranded literal — instead of demanding the branded `minItems`-constrained `Type`, which no caller outside the compiler could construct.
