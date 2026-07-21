---
"@studnicky/predicates": major
---

### Changed

- `coerceToBoolean()` returns `boolean | undefined` directly and `coerceToNumber()` returns `number | undefined` directly.
- Pattern and multiple-of constraints use the canonical `checkPattern()` and `checkMultipleOf()` methods.
- `@studnicky/predicates` is the sole public code entrypoint.
