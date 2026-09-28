---
"@studnicky/logger": major
---

`CloudWatchLogSchemaFieldsEntity.create`, `LogBodyConfigEntity.create`, `LogBodyDataEntity.create`, `LogFaultDataEntity.create`, and `TimingFieldsEntity.create` accept their respective `InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`/`minLength`-constrained `Type`, which no caller outside the compiler could construct.
