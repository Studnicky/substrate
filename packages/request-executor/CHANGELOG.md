# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `RequestExecutor` class composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/timing`, and `@studnicky/context` into a one-shot request execution pattern: `execute(fn, options)` composes a cancellation signal, runs `fn` through the retry loop, optionally brackets the call with a `Timing` span, and optionally runs the whole call inside a `Context` scope.
- `RequestExecutorConfigType` and `RequestExecutorExecuteOptionsType` public types.
- `RequestExecutorBuilder` fluent builder mirroring the `@studnicky/retry` `RetryBuilder` pattern.
- Getters (`getFetchClient`, `getRetry`, `getSignal`, `getTiming`, `getContext`) exposing every composed primitive instance for transparency and subclass extension.
