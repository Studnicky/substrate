---
"@studnicky/file-lock": patch
---

`FileLockRecoveryOptionsInterface.inspection` references `FileLockInspectionEntity.InputType` instead of the branded `.Type` — `FileLockRecovery.restore()` already `intake()`s `options.inspection` internally, treating it as untrusted despite the interface demanding pre-branded data. `FileLockInspectionEntity` gains `InputType`, threaded through `create`'s second type parameter.
