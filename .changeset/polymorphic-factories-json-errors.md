---
"@studnicky/json": minor
"@studnicky/errors": minor
---

### Added

- `@studnicky/json`'s `Patch.create()` returns the subclass instance type when called on a subclass, instead of the base `Patch` type.
- `@studnicky/errors`' `ValidationErrors.create()` and `DefaultHttpErrorClassifier.create()` return the subclass instance type when called on a subclass, instead of the base type.
- Each of these factories now validates at runtime (via `Reflect.construct` plus an `instanceof` check) that the constructor invoked as `this` actually produced the requested subclass, throwing a `TypeError` naming the factory if it did not.
