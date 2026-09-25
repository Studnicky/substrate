---
"@studnicky/file-lock": major
---

`FileLockPathStateEntity.create` accepts `FileLockPathStateEntity.InputType` — plain, unbranded strings for `lockPath`/`originalPath` — instead of demanding the branded `minLength`-constrained `Type`, which no caller outside the compiler could construct.
