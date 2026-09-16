import type { OperationFunctionInterface } from '@studnicky/pipeline/interfaces';
import type { RequestExecutorDepsInterface, RequestExecutorOperationContextInterface } from '@studnicky/request-executor/interfaces';
/** observedRequestExecutor — direct composition of caller-owned subclassed primitives. Run: npx tsx examples/observedRequestExecutor.ts */
// #region usage
import type { RetryConfigInterface, RetryContextInterface } from '@studnicky/retry/interfaces';

import { RuntimeError } from '@studnicky/errors/node';
import { FetchClient, type RequestContextInterface, type ResponseContextInterface } from '@studnicky/fetch/node';
import { OperationPipeline } from '@studnicky/pipeline/node';
import { RequestExecutor } from '@studnicky/request-executor/node';
import { Retry } from '@studnicky/retry/node';
import { Signal } from '@studnicky/signal/node';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

class TelemetryFetchClient extends FetchClient {
  readonly requestPaths: string[] = [];

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    console.log(`[fetch] ${context.metadata.method} ${context.metadata.path}`);
    this.requestPaths.push(context.metadata.path);
    const result = Promise.resolve(context);
    return result;
  }

  protected override onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    console.log(`[fetch] <- ${context.response.status}`);
    const result = Promise.resolve(context);
    return result;
  }
}

class TelemetryRetry extends Retry {
  readonly scheduledRetries: number[] = [];

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override onRetryScheduled(context: RetryContextInterface): void {
    console.log('[retry] attempt', context.attemptNumber, 'scheduled retry');
    this.scheduledRetries.push(context.attemptNumber);
  }
}

class PolicyAudit {
  static readonly events: string[] = [];

  static async trace<TResult>(
    context: RequestExecutorOperationContextInterface,
    next: OperationFunctionInterface<RequestExecutorOperationContextInterface, TResult>
  ): Promise<TResult> {
    console.log('[policy] signal aborted:', context.signal.aborted);
    PolicyAudit.events.push('before');
    const result = await next(context);
    PolicyAudit.events.push('after');
    return result;
  }
}

/**
 * RequestExecutor's own `onExecuteStart`/`onExecuteComplete`/`onExecuteError` hooks give
 * span-level observability around the whole retry loop; retry-level reporting (attempt counts)
 * still lives on `Retry` itself, so the subclass explicitly owns the `TelemetryRetry` dependency
 * it needs for `report()`.
 */
class ReportingRequestExecutor extends RequestExecutor {
  readonly #retry: TelemetryRetry;
  readonly errorMessages: string[] = [];

  protected constructor(deps: RequestExecutorDepsInterface) {
    super(deps);
    if (!(deps.retry instanceof TelemetryRetry)) {
      throw RuntimeError.create('ReportingRequestExecutor requires TelemetryRetry');
    }
    this.#retry = deps.retry;
  }

  // `this.create(...)` (not `RequestExecutor.create(...)`) so the inherited factory's
  // `new this(...)` binds to ReportingRequestExecutor — same `new this()` polymorphism
  // FetchClient/Retry use for their own subclass factories.
  static tracked(
    fetchClient: TelemetryFetchClient,
    retry: TelemetryRetry,
    pipeline: OperationPipeline<RequestExecutorOperationContextInterface>
  ): ReportingRequestExecutor {
    const result = this.create({ 'fetchClient': fetchClient, 'pipeline': pipeline, 'retry': retry, 'signal': Signal.create() });

    if (!(result instanceof ReportingRequestExecutor)) {
      throw RuntimeError.create('RequestExecutor subclass factory returned the wrong instance type');
    }

    return result;
  }

  protected override onExecuteError(error: Error): void {
    console.log('[execute] failed', error.message);
    this.errorMessages.push(error.message);
  }

  report(): { 'retries': number; 'totalRequests': number } {
    const stats = this.#retry.getStats();

    return { 'retries': stats.totalRetries, 'totalRequests': stats.totalRequests };
  }
}
// #endregion usage

let failuresRemaining = 2;

const server = createServer((req, res) => {
  if (req.url === '/flaky') {
    if (failuresRemaining > 0) {
      failuresRemaining -= 1;
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('fail');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('not found');
});

await new Promise<void>((resolve) => {
  server.listen(0, resolve);
});

const address = server.address();

if (address === null || typeof address !== 'object') {
  throw RuntimeError.create('failed to determine server address');
}

// #region usage
const fetchClient = TelemetryFetchClient.create({ 'baseURL': `http://localhost:${address.port}` });
const retry = new TelemetryRetry({ 'maximumRetries': 3 });

const executor = ReportingRequestExecutor.tracked(fetchClient, retry, OperationPipeline.create([PolicyAudit.trace]));

const response = await executor.execute(async (client, signal) => {
  const result = await client.get('/flaky', { 'signal': signal });

  if (!result.ok) {
    throw RuntimeError.create(`HTTP ${result.status}`);
  }

  return result;
});

console.log('Response status:', response.status);
console.log('Report:', executor.report());
// #endregion usage

assert.ok(executor instanceof ReportingRequestExecutor);
assert.equal(response.status, 200);
assert.equal(await response.text(), 'ok');
assert.deepEqual(fetchClient.requestPaths, ['/flaky', '/flaky', '/flaky']);
assert.deepEqual(retry.scheduledRetries, [0, 1]);

const report = executor.report();

assert.equal(report.totalRequests, 1);
assert.equal(report.retries, 2);
// The two /flaky 500s are absorbed by the retry loop, so execute() never fails and
// onExecuteError never fires.
assert.deepEqual(executor.errorMessages, []);
assert.deepEqual(PolicyAudit.events, ['before', 'after']);
assert.equal(executor.hookErrorCount, 0);

server.close();

console.log('observedRequestExecutor: all assertions passed');
