---
"@studnicky/file-lock": major
---

`FileLockCreateOptionsInterface`, `FileRenameLockCreateOptionsInterface`, and `WebLockCreateOptionsInterface` reference `FileLockOptionsEntity.InputType`/`WebLockOptionsEntity.InputType` instead of the branded `.Type`. A caller has never been able to construct a branded value, so a public parameter typed with `.Type` demanded a guarantee no caller could supply — `FileLock.create`/`FileRenameLock.create`/`WebLock.create` already earn the brand via `intake` internally; the public options interfaces were asserting that guarantee a step too early. `FileLockOptionsEntity` and `WebLockOptionsEntity` gain `InputType` and thread it through `create`'s second type parameter, matching `intake`'s existing contract.
