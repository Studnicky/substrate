---
"@studnicky/config": major
---

### Changed

- The package root is the sole public code entrypoint for configuration validation, clamping entities, and `ConfigurationError`.

### Added

- `ClampedConfig` pure-static class, the soft-correction sibling to `ConfigValidation`'s hard-fail assertions: given a flat config object and a declarative table of `{min, max, reason}` rules per numeric field, `apply()` returns a **new** object with out-of-range numeric fields clamped into range instead of throwing. Fields absent from the rule table, non-numeric, or already in range are copied through unchanged; the input is never mutated.
- `ClampedConfig` exposes a protected static `onClamp(event)` hook, mirroring `ConfigValidation`'s static hook idiom, overridable via subclassing to observe clamp events without coupling the base class to any logging package.
- `ClampEventType` and `ClampRuleType` exported types.
