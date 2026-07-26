---
"@studnicky/errors": patch
---

### Fixed

- `matchers.instance.of()` and `matchers.instance.ofAny()` accept built-in error constructors. Both declare their constructor parameter as `new (...args: never[]) => T`, so a constructor with its own parameter list — such as `TypeError`'s `(message?: string, options?: ErrorOptions)` — satisfies it. `ofAny(TypeError, RangeError, ReferenceError)`, the form shown in the method's own documentation, type-checks.
