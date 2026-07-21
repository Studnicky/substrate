---
"@studnicky/circular-buffer": major
---

### Changed

- The package root is the sole public code entrypoint and exports `CircularBuffer`, `CircularBufferInterface`, `CircularBufferOptionsEntity`, `CircularBufferStateEntity`, and the domain error; storage constants remain implementation details.
- `CircularBuffer` constructor is `protected`. Use `CircularBuffer.create(options)` to construct instances. Subclasses that call `super(options)` are unaffected.

### Added

- `CircularBuffer.create(options?)` — validated static factory; the single construction entry point.
