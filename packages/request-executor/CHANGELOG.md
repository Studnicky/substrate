# Changelog

## 7.0.1

### Patch Changes

- @studnicky/context@7.0.1
- @studnicky/fetch@7.0.1
- @studnicky/retry@7.0.1
- @studnicky/signal@7.0.1
- @studnicky/timing@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. Fluent builders assemble their options object via `@studnicky/types`'s `PickDefined.from()` instead of manual spread-ternary chains. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/retry@7.0.0
  - @studnicky/fetch@7.0.0
  - @studnicky/context@7.0.0
  - @studnicky/timing@7.0.0
  - @studnicky/signal@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `RequestExecutor` class composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/timing`, and `@studnicky/context` into a one-shot request execution pattern: `execute(fn, options)` composes a cancellation signal, runs `fn` through the retry loop, optionally brackets the call with a `Timing` span, and optionally runs the whole call inside a `Context` scope.
- `RequestExecutorConfigType` and `RequestExecutorExecuteOptionsType` public types.
- `RequestExecutorBuilder` fluent builder mirroring the `@studnicky/retry` `RetryBuilder` pattern.
- Getters (`getFetchClient`, `getRetry`, `getSignal`, `getTiming`, `getContext`) exposing every composed primitive instance for transparency and subclass extension.
