/** observedRequestExecutor — direct composition of caller-owned subclassed primitives. Run: npx tsx examples/observedRequestExecutor.ts */

// #region usage
import type { RetryConfigInterface, RetryContextInterface } from '@studnicky/retry';

import {
  FetchClient,
  type RequestContextInterface,
  type ResponseContextInterface
} from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

import type { RequestExecutorDepsInterface } from '../src/index.js';

import { RequestExecutor } from '../src/index.js';

class TelemetryFetchClient extends FetchClient {
  readonly requestPaths: string[] = [];

  static override create(config = {}): TelemetryFetchClient {
    return new this(config);
  }

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    console.log(`[fetch] ${context.metadata.method} ${context.metadata.path}`);
    this.requestPaths.push(context.metadata.path);
    return Promise.resolve(context);
  }

  protected override onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    console.log(`[fetch] <- ${context.response.status}`);
    return Promise.resolve(context);
  }
}

class TelemetryRetry extends Retry {
  readonly scheduledRetries: number[] = [];

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override onRetryScheduled(context: RetryContextInterface): void {
    console.log(`[retry] attempt ${context.attemptNumber} scheduled retry`);
    this.scheduledRetries.push(context.attemptNumber);
  }
}

/**
 * RequestExecutor has no hooks of its own, so the subclass explicitly owns the
 * retry dependency needed by its reporting behavior.
 */
class ReportingRequestExecutor extends RequestExecutor {
  readonly #retry: TelemetryRetry;

  protected constructor(deps: RequestExecutorDepsInterface) {
    super(deps);
    if (!(deps.retry instanceof TelemetryRetry)) {
      throw new TypeError('ReportingRequestExecutor requires TelemetryRetry');
    }
    this.#retry = deps.retry;
  }

  // `this.create(...)` (not `RequestExecutor.create(...)`) so the inherited factory's
  // `new this(...)` binds to ReportingRequestExecutor — same `new this()` polymorphism
  // FetchClient/Timing/Retry use for their own subclass factories.
  static tracked(fetchClient: TelemetryFetchClient, retry: TelemetryRetry): ReportingRequestExecutor {
    const result = this.create({ 'fetchClient': fetchClient, 'retry': retry });

    if (!(result instanceof ReportingRequestExecutor)) {
      throw new Error('RequestExecutor subclass factory returned the wrong instance type');
    }

    return result;
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
  throw new Error('failed to determine server address');
}

// #region usage
const fetchClient = TelemetryFetchClient.create({ 'baseURL': `http://localhost:${address.port}` });
const retry = new TelemetryRetry({ 'maxRetries': 3 });

const executor = ReportingRequestExecutor.tracked(fetchClient, retry);

const response = await executor.execute(async (client, signal) => {
  const result = await client.get('/flaky', { 'signal': signal });

  if (!result.ok) {
    throw new Error(`HTTP ${result.status}`);
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

server.close();

console.log('observedRequestExecutor: all assertions passed');
