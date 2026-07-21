---
"@studnicky/sample-buffer": major
---

### Added

- `SampleBuffer.create({ capacity })` static factory — the single validated construction entry point.
- `SampleBufferOptionsEntity` namespace with JSON Schema, `Type`, and `validate` for options validation.
- Constructor is now `protected`; construction through `new SampleBuffer()` outside the class is no longer possible.
- `@studnicky/sample-buffer` is the sole public code entrypoint.
