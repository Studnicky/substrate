---
"@studnicky/request-executor": major
---

### Added

- `RequestExecutor` class composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/timing`, and `@studnicky/context` into a one-shot request execution pattern: `execute(fn, options)` composes a cancellation signal, runs `fn` through the retry loop, optionally brackets the call with a `Timing` span, and optionally runs the whole call inside a `Context` scope.
- `RequestExecutorConfigInterface` and `RequestExecutorExecuteOptionsInterface` public contracts.
- `RequestExecutorDepsInterface` provides the resolved constructor contract for subclasses that explicitly own configured collaborators.
