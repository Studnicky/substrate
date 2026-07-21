---
"@studnicky/file-lock": major
---

### Added

- `FileLock.create(options)` — canonical async factory accepting `{ path, pollMs?, timeoutMs? }`; validates options via `FileLockOptionsEntity` schema and throws `FileLockConfigError` on invalid input.
- `FileLockOptionsEntity` schema extended with the required `path` field.

### Changed

- Runtime construction and owner-token contracts are exported as `FileLockCreateOptionsInterface` and `OwnerTokenInterface`; schema-backed options remain `FileLockOptionsEntity.Type`.
