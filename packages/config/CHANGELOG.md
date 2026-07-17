# Changelog

## 7.0.0

### Patch Changes

- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/errors@7.0.0
  - @studnicky/json@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `ClampedConfig` pure-static class, the soft-correction sibling to `ConfigValidation`'s hard-fail assertions: given a flat config object and a declarative table of `{min, max, reason}` rules per numeric field, `apply()` returns a **new** object with out-of-range numeric fields clamped into range instead of throwing. Fields absent from the rule table, non-numeric, or already in range are copied through unchanged; the input is never mutated.
- `ClampedConfig` exposes a protected static `onClamp(event)` hook, mirroring `ConfigValidation`'s static hook idiom, overridable via subclassing to observe clamp events without coupling the base class to any logging package.
- `ClampEventType` and `ClampRuleType` exported types.

## [1.0.0] - 2026-06-22

### Added

- `ConfigValidation` pure-static class with assertion methods (`assertString`, `assertNumber`, `assertBoolean`, `assertInteger`, `assertFinite`, `assertNonNegative`, `assertPositive`, `assertMin`, `assertPositiveOrInfinity`, `assertHasMethod`, `assertFunctionOrObjectWithMethod`, `assertNoUnknownKeys`) that throw `ConfigurationError` on failure and skip validation for `undefined`/`null` values.
- `TypeGuards` pure-static class with type predicates (`isObject`, `isFunction`, `isNonNegativeInteger`, `isPositiveInteger`) for runtime type narrowing.
- `ConfigurationError` error class with static `create(message, cause?)` factory, fixed error code `config.invalid`, and `retryable: false` semantics via `BaseError`.
- `ensureError` utility that safely converts any caught `unknown` value to an `Error` instance.
