---
"@studnicky/fsm": minor
---

### Added

- `EffectInterpreterConstructorOptionsInterface` is exported from `@studnicky/fsm`. A subclass that declares its own constructor needs this type to annotate the parameter it forwards to `super()`, and it was previously module-local — leaving the documented extension path unnameable from outside the package. It differs from the shape `create()` accepts in one respect: `machine` is required, because `create()` validates the caller's optional value and throws before the constructor runs.
