---
"@studnicky/request-executor": minor
---

### Changed

- `RequestExecutor` composes `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, and `@studnicky/context`. `timing` is not a field on `RequestExecutorConfigInterface` or `RequestExecutorDepsInterface`, and `package.json` carries no `@studnicky/timing` dependency.

### Added

- `RequestExecutor` exposes three protected lifecycle hooks bracketing the retry loop: `onExecuteStart()`, `onExecuteComplete<T>(result)`, and `onExecuteError(error)`. All three are no-ops by default and run through an internal `HookInvoker` that swallows a throwing override — a rejected hook is recorded via `hookErrorCount`/`getHookErrors()` but never replaces `execute()`'s resolved result or thrown error.
