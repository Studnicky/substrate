---
"@studnicky/logger": major
"@studnicky/virtual-fs": major
---

### Changed

- `@studnicky/logger` exports `LoggerHookEventShapeEntity`. It replaces `LoggerHookEventKindEntity`; the entity's members and validator are unchanged.
- `@studnicky/virtual-fs` `EntryEntity.Type` names its variant discriminant `shape`. It replaces `kind` and carries the same `'directory' | 'file'` values. `VirtualFileSystem.statSync()` results and every `EntryEntity` literal read or written by a consumer use the new field name.
