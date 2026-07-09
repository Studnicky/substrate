# Changelog

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
