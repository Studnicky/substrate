---
"@studnicky/fsm": major
---

`InterpreterHistoryRecordMetadataEntity.create` accepts `InterpreterHistoryRecordMetadataEntity.InputType` — a plain, unbranded literal — instead of demanding the branded `minimum`-constrained `Type`, which no caller outside the compiler could construct.
