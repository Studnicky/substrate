---
"@studnicky/mutex": major
---

### Changed

- The package root is the sole public code entrypoint. Mutex implementation constants remain internal.
- `Mutex.create(config?)` is the sole construction entry point; the constructor remains protected for subclassing.
- `Mutex.create()` uses `new this()` internally so subclass factories return the correct subclass type.
- Per-key FSM state is exported as the schema-backed `MutexKeyStateEntity.Type`.
