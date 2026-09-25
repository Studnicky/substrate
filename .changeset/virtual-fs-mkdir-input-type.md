---
"@studnicky/virtual-fs": patch
---

`FileSystemInterface.mkdirSync`'s `options` parameter references `MkdirOptionsEntity.InputType` instead of the branded `.Type` — a public method demanding a caller supply already-branded data, which no caller can do. `VirtualFileSystem.mkdirSync`'s implementation matches. `recursive` carries no numeric/string constraint, so `.Type` and `.InputType` are structurally identical for this entity; no caller's behavior changes.
