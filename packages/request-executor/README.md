# @studnicky/request-executor

> One-shot request execution pattern composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/timing`, and `@studnicky/context`

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/request-executor)

Composes five substrate primitives into the "one-shot request execution" pattern: a caller-supplied `AbortSignal` and/or `deadlineMs` are merged via `Signal#compose()`, the call runs through the `Retry` loop, an optional `Timing` instance brackets the whole retry loop with a single span, and — when a `Context` is composed — the entire call runs inside a fresh `ContextScope`. `RequestExecutor` does not perform HTTP calls itself; the caller's `fn` receives the composed `FetchClient` and the composed `AbortSignal` and decides which verb to call.

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

## Transparency

`RequestExecutor` introduces no hook of its own — every observable stage is already covered by the composed primitive it delegates to:

| Getter | Returns |
|--------|---------|
| `getFetchClient()` | The composed `FetchClient` instance |
| `getRetry()` | The composed `Retry` instance |
| `getSignal()` | The composed `Signal` instance |
| `getTiming()` | The composed `Timing` instance, or `undefined` if none was supplied |
| `getContext()` | The composed `Context` instance, or `undefined` if none was supplied |

Every getter returns the exact instance passed to `create()`/`builder()` — never a copy or wrapper — so a caller who subclassed `FetchClient` for auth headers, `Retry` for custom backoff, or `Timing`/`Context` for correlation keeps full access to those subclasses' own hooks.

## Extending

Subclass `RequestExecutor` to add convenience behavior that reaches the composed instances through the getters — `RequestExecutor` has no lifecycle hooks of its own to override. Subclass the composed primitives themselves (`FetchClient`, `Retry`, `Timing`, `Context`) to observe or transform request/response/attempt/event stages; those hooks fire exactly as they would standalone.

```typescript
import { Retry } from '@studnicky/retry';
import { RequestExecutor } from '@studnicky/request-executor';

class TelemetryRetry extends Retry {
  readonly scheduledRetries: number[] = [];

  protected override onRetryScheduled(context: RetryContextType): void {
    this.scheduledRetries.push(context.attemptNumber);
  }
}

class ReportingRequestExecutor extends RequestExecutor {
  static tracked(retry: TelemetryRetry): ReportingRequestExecutor {
    return RequestExecutor.create({ retry }) as ReportingRequestExecutor;
  }

  report(): { retries: number; totalRequests: number } {
    const stats = this.getRetry().getStats();
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
