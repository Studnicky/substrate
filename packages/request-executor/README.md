# @studnicky/request-executor

> One-shot request execution pattern composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/timing`, and `@studnicky/context`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/request-executor)

Composes five substrate primitives into the "one-shot request execution" pattern: a caller-supplied `AbortSignal` and/or `deadlineMs` are merged via `Signal#compose()`, the call runs through the `Retry` loop, an optional `Timing` instance brackets the whole retry loop with a single span, and — when a `Context` is composed — the entire call runs inside a fresh `ContextScope`. `RequestExecutor` does not perform HTTP calls itself; the caller's `fn` receives the composed `FetchClient` and the composed `AbortSignal` and decides which verb to call.

`RequestDeadlineEntity` is the package-root schema contract shared by executor defaults, resolved dependencies, and per-call overrides. Its validator accepts an omitted deadline or a non-negative `deadlineMs`, matching `Signal#compose()`.

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
  retry: { maxRetries: 3 },
  deadlineMs: 5000
});

const response = await executor.execute((client, signal) => client.get('/users', { signal }));
```

Each composed primitive accepts either a pre-built instance (subclassed or not) or the config shape passed straight to that primitive's own `create()`. `signal`, `timing`, and `context` accept instances only — pass a `Signal`, `Timing`, or `Context` instance directly.

## Observability

`RequestExecutor` introduces no hook of its own. Callers retain explicit ownership of configured `FetchClient`, `Retry`, `Signal`, `Timing`, and `Context` instances when they need their lifecycle hooks, statistics, or domain-specific behavior. The executor exposes only the composed request behavior through `execute()`.

## Extending

Subclass the composed primitives (`FetchClient`, `Retry`, `Timing`, `Context`) to observe or transform request/response/attempt/event stages; those hooks fire exactly as they would standalone. A `RequestExecutor` subclass that needs one of those dependencies explicitly owns it through the resolved constructor contract.

```typescript
import type { RetryConfigInterface, RetryContextInterface } from '@studnicky/retry';
import type { RequestExecutorDepsInterface } from '@studnicky/request-executor';

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

const retry = new TelemetryRetry({ maxRetries: 3 });
const executor = ReportingRequestExecutor.tracked(retry);
```

See `examples/observedRequestExecutor.ts` for the full runnable version, including a subclassed `FetchClient`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/request-executor

## License

MIT
