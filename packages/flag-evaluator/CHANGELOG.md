# Changelog

## 7.0.1

### Patch Changes

- @studnicky/errors@7.0.1
- @studnicky/json@7.0.1
- @studnicky/types@7.0.1

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

## [1.0.0] - 2026-07-08

### Added

- `FlagEvaluator` class: local-only, deterministic boolean feature-flag evaluation via `register()`/`unregister()`/`has()`/`list()`/`evaluate()`. No remote fetch, no polling, no vendor SDK coupling.
- Deterministic percentage rollout: `evaluate()` buckets `context.targetingKey` via `@studnicky/json`'s `Hash`, so the same flag and targeting key always land in the same bucket.
- Explicit unregistered-vs-disabled semantics: an unregistered flag always resolves `false`; a registered-but-disabled flag resolves its own `defaultValue`.
- Protected observability hooks `onEvaluate`, `onDefault`, and `onRuleMismatch` for logging/tracing/metrics via subclassing.
- `FlagContextType` and `FlagDefinitionType` exported types.
