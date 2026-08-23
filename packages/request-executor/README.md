# @studnicky/request-executor

> One-shot request execution pattern composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, and `@studnicky/context`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/request-executor)

Composes four substrate primitives into the "one-shot request execution" pattern: a caller-supplied `AbortSignal` and/or `deadlineMs` are merged via `Signal#compose()`, the call runs through the `Retry` loop bracketed by `onExecuteStart`/`onExecuteComplete`/`onExecuteError` lifecycle hooks, and — when a `Context` is composed — the entire call runs inside a fresh `ContextScope`. `RequestExecutor` does not perform HTTP calls itself; the caller's `fn` receives the composed `FetchClient` and the composed `AbortSignal` and decides which verb to call.

`RequestDeadlineEntity` is the schema contract shared by executor defaults, resolved dependencies, and per-call overrides. Import it from `@studnicky/request-executor/entities`; its validator accepts an omitted deadline or a non-negative `deadlineMs`, matching `Signal#compose()`.

## Install

Packages publish to GitHub Packages — add the registry to `.npmrc`:

```
@studnicky:registry=https://npm.pkg.github.com
```

```sh
pnpm add @studnicky/request-executor
```

## Usage

```typescript
import { RequestExecutor } from '@studnicky/request-executor';

const executor = RequestExecutor.create({
  fetchClient: { baseURL: 'https://api.example.com' },
  retry: { maximumRetries: 3 },
  deadlineMs: 5000
});

const response = await executor.execute((client, signal) => client.get('/users', { signal }));
```

Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`. `signal` and `context` accept instances only — pass a `Signal` or `Context` instance directly.

## Observability

`RequestExecutor` exposes three lifecycle hooks bracketing the retry loop: `onExecuteStart` (before the loop begins), `onExecuteComplete` (after it resolves, with the result), and `onExecuteError` (once retries are exhausted, with the raw error). All three are no-ops by default and run through an internal `HookInvoker` that swallows a throwing override — a rejected hook is recorded (see `hookErrorCount`/`getHookErrors()`) but never replaces `execute()`'s resolved result or thrown error. Callers retain explicit ownership of configured `FetchClient`, `Retry`, `Signal`, and `Context` instances when they need those primitives' own lifecycle hooks, statistics, or domain-specific behavior.

## Extending

Override `onExecuteStart`/`onExecuteComplete`/`onExecuteError` to observe the whole call, or subclass the composed primitives (`FetchClient`, `Retry`, `Context`) to observe or transform request/response/attempt/event stages; those primitive hooks fire exactly as they would standalone. A `RequestExecutor` subclass that needs one of those dependencies explicitly owns it through the resolved constructor contract.

```typescript
import type { RetryConfigInterface, RetryContextInterface } from '@studnicky/retry';
import type { RequestExecutorDepsInterface } from '@studnicky/request-executor/interfaces';

import { Retry } from '@studnicky/retry';
import { RequestExecutor } from '@studnicky/request-executor';

class TelemetryRetry extends Retry {
  readonly scheduledRetries: number[] = [];

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override onRetryScheduled(context: RetryContextInterface): void {
    this.scheduledRetries.push(context.attemptNumber);
  }
}

class ReportingRequestExecutor extends RequestExecutor {
  readonly #retry: TelemetryRetry;

  protected constructor(deps: RequestExecutorDepsInterface) {
    super(deps);
    if (!(deps.retry instanceof TelemetryRetry)) {
      throw new TypeError('ReportingRequestExecutor requires TelemetryRetry');
    }
    this.#retry = deps.retry;
  }

  static tracked(retry: TelemetryRetry): ReportingRequestExecutor {
    const executor = this.create({ retry });

    if (!(executor instanceof ReportingRequestExecutor)) {
      throw new Error('RequestExecutor subclass factory returned the wrong instance type');
    }

    return executor;
  }

  report(): { retries: number; totalRequests: number } {
    const stats = this.#retry.getStats();
    return { retries: stats.totalRetries, totalRequests: stats.totalRequests };
  }
}

const retry = new TelemetryRetry({ maximumRetries: 3 });
const executor = ReportingRequestExecutor.tracked(retry);
```

See `examples/observedRequestExecutor.ts` for the full runnable version, including a subclassed `FetchClient`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/request-executor

## License

MIT
