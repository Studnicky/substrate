---
"@studnicky/fsm": patch
---

`RegisteredInterpreterMetricsEntity` gains `InputType`, threaded through `create`'s second type parameter. `EffectInterpreter.hookErrorCount` returned a plain `number` while `RegisteredInterpreterInterface.hookErrorCount` demanded `RegisteredInterpreterMetricsEntity.Type['hookErrorCount']`, making `EffectInterpreter` structurally fail to satisfy the interface it implements. The getter now earns the brand via a positive `validate()` guard before returning.
