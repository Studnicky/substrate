# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `BoundedDispatcher` class composing `@studnicky/concurrency`'s `Semaphore`, `@studnicky/event-bus`, and `@studnicky/scheduler` into the "bounded work dispatch" pattern: `dispatch(fn)` acquires a semaphore permit, runs `fn`, and publishes `'dispatch'` lifecycle events (`start` / `success` / `error`) onto the composed `EventBus`; `scheduleDispatch(atMs, fn)` layers a scheduler-driven delayed dispatch on top, returning the scheduler's own cancellable task handle.
- `BoundedDispatcherConfigType`, `BoundedDispatcherEventType`, `BoundedDispatcherTopicMapType`, and `BoundedDispatcherComposedTopicMapType` public types.
- `BoundedDispatcherBuilder` fluent builder mirroring the `@studnicky/request-executor` `RequestExecutorBuilder` pattern.
- Getters (`getSemaphore`, `getBus`, `getScheduler`) exposing every composed primitive instance for transparency and subclass extension.
