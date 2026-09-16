# @studnicky/request-executor

> One-shot request execution pattern composing `@studnicky/fetch`, `@studnicky/retry`, `@studnicky/signal`, `@studnicky/pipeline`, and an optional request scope

[![Docs](https://img.shields.io/badge/docs-studnicky.github.io-14b8a6)](https://studnicky.github.io/substrate/packages/request-executor)

Import runtime values from `@studnicky/request-executor/node` in Node or `@studnicky/request-executor/browser` in browsers. Composes fetch, retry, signal, optional operation policies, and a scope port into the 'one-shot request execution' pattern: a caller-supplied `AbortSignal` and/or `deadlineMs` are merged via `Signal#compose()`, the call runs through the `Retry` loop bracketed by `onExecuteStart`/`onExecuteComplete`/`onExecuteError` lifecycle hooks. An optional `OperationPipeline` surrounds that observed retry operation, and an optional scope factory runs the entire call in a fresh scope. `RequestExecutor` does not perform HTTP calls itself; the caller's `fn` receives the composed `FetchClient` and the composed `AbortSignal` and decides which verb to call.

`RequestExecutorConfigDataEntity` validates the executor's serializable default data, and `RequestExecutorExecuteOptionsDataEntity` validates serializable per-call data. Both reject undeclared keys, omit declared `undefined` values, and require JSON-compatible data. Import them from `@studnicky/request-executor/entities`.

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
import { FetchClient } from '@studnicky/fetch/node';
import { RequestExecutor } from '@studnicky/request-executor/node';
import { Retry } from '@studnicky/retry/node';
import { Signal } from '@studnicky/signal/node';

const executor = RequestExecutor.create({
  fetchClient: FetchClient.create({ baseURL: 'https://api.example.com' }),
  retry: Retry.create({ maximumRetries: 3 }),
  signal: Signal.create(),
  deadlineMs: 5000
});

const response = await executor.execute((client, signal) => client.get('/users', { signal }));
```

`fetchClient`, `retry`, and `signal` are required runtime ports. `retry` accepts any `RetryInterface`, while `signal` accepts any `SignalInterface`; `Retry` and `Signal` are supplied implementations. An optional `pipeline` accepts any `OperationPipelineInterface<RequestExecutorOperationContextInterface>`; `OperationPipeline` is the supplied implementation.

## Execution policies

Use `pipeline` when a policy needs to surround one complete, observed request execution. Its context exposes the executor's `FetchClientInterface` and the composed per-call `AbortSignal`. Interceptors enter in declaration order. They own any local recovery they need; the executor provides no error modes or recovery behavior. A policy or callback failure leaves through the pipeline unchanged, subject only to the configured `Retry` terminal-error contract.

```typescript
import { OperationPipeline } from '@studnicky/pipeline/node';
import type { OperationInterceptorInterface } from '@studnicky/pipeline/interfaces';
import type { RequestExecutorOperationContextInterface } from '@studnicky/request-executor/interfaces';

const trace: OperationInterceptorInterface<RequestExecutorOperationContextInterface> = async (context, next) => {
  console.log(context.signal.aborted);
  return next(context);
};

const pipeline = OperationPipeline.create([trace]);
```

## Observability

`RequestExecutor` exposes three lifecycle hooks bracketing the retry loop: `onExecuteStart` (before the loop begins), `onExecuteComplete` (after it resolves, with the result), and `onExecuteError` (once retries are exhausted, with the raw error). All three are no-ops by default and run through an internal `HookInvoker` that swallows a throwing override — a rejected hook is recorded (see `hookErrorCount`/`getHookErrors()`) but never replaces `execute()`'s resolved result or thrown error. Callers retain explicit ownership of configured `FetchClient`, `Retry`, `Signal`, and scope instances when they need those primitives' own lifecycle hooks, statistics, or domain-specific behavior.

## Extending

Override `onExecuteStart`/`onExecuteComplete`/`onExecuteError` to observe the whole call, or subclass the composed primitives (`FetchClient`, `Retry`, and scope adapters) to observe or transform request/response/attempt/event stages; those primitive hooks fire exactly as they would standalone. A `RequestExecutor` subclass that needs one of those dependencies explicitly owns it through the resolved constructor contract.

```typescript
import type { RetryConfigInterface, RetryContextInterface } from '@studnicky/retry/interfaces';
import type { RequestExecutorDepsInterface } from '@studnicky/request-executor/interfaces';

import { FetchClient } from '@studnicky/fetch/node';
import { Retry } from '@studnicky/retry/node';
import { RequestExecutor } from '@studnicky/request-executor/node';
import { Signal } from '@studnicky/signal/node';

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

  static tracked(fetchClient: FetchClient, retry: TelemetryRetry, signal: Signal): ReportingRequestExecutor {
    const executor = this.create({ fetchClient, retry, signal });

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

const fetchClient = FetchClient.create({ baseURL: 'https://api.example.com' });
const retry = new TelemetryRetry({ maximumRetries: 3 });
const executor = ReportingRequestExecutor.tracked(fetchClient, retry, Signal.create());
```

See `examples/observedRequestExecutor.ts` for the full runnable version, including a subclassed `FetchClient`.

## Documentation

Full reference: https://studnicky.github.io/substrate/packages/request-executor

## License

MIT
