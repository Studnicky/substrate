# Changelog

## 7.0.1

### Patch Changes

- @studnicky/concurrency@7.0.1
- @studnicky/event-bus@7.0.1
- @studnicky/scheduler@7.0.1
- @studnicky/types@7.0.1

## 7.0.0

### Patch Changes

- d2b44b7: Domain error constructors route through `@studnicky/errors`'s `DomainErrorArgs.build()` instead of hand-rolled `super({code,message,retryable})` boilerplate. `@studnicky/fetch`'s config validators subclass `@studnicky/config`'s `ConfigValidation`. `@studnicky/eslint-config`'s duplicated rule-internal AST helpers are consolidated under `rules/shared/`. No public API or behavior changes.
- Updated dependencies [d2b44b7]
- Updated dependencies [d2b44b7]
  - @studnicky/types@7.0.0
  - @studnicky/concurrency@7.0.0
  - @studnicky/event-bus@7.0.0
  - @studnicky/scheduler@7.0.0

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `BoundedDispatcher` class composing `@studnicky/concurrency`'s `Semaphore`, `@studnicky/event-bus`, and `@studnicky/scheduler` into the "bounded work dispatch" pattern: `dispatch(fn)` acquires a semaphore permit, runs `fn`, and publishes `'dispatch'` lifecycle events (`start` / `success` / `error`) onto the composed `EventBus`; `scheduleDispatch(atMs, fn)` layers a scheduler-driven delayed dispatch on top, returning the scheduler's own cancellable task handle.
- `BoundedDispatcherConfigInterface`, `BoundedDispatcherTopicMapInterface`, `BoundedDispatcherStartEventInterface`, `BoundedDispatcherSuccessEventInterface`, and `BoundedDispatcherErrorEventInterface` are public runtime contracts. The dispatch interfaces compose their phase discriminants from `BoundedDispatcherStartEventEntity`, `BoundedDispatcherSuccessEventEntity`, and `BoundedDispatcherErrorEventEntity`.
- `getBus()` exposes the typed dispatch event bus for subscriptions and domain-specific bus behavior.
- `hookErrorCount` and `getHookErrors()` expose rejected non-blocking lifecycle publications as deeply defensive `HookInvocationError` snapshots without changing the dispatched work's result or error.
