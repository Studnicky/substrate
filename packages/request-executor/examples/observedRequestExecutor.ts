/** observedRequestExecutor — direct composition of subclassed primitives, plus an extension subclass reaching composed instances via getters. Run: npx tsx examples/observedRequestExecutor.ts */

// #region usage
import type { RequestContextType, ResponseContextType } from '@studnicky/fetch/interfaces';
import type { RetryConfigInterface, RetryContextType } from '@studnicky/retry';

import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

import { RequestExecutor } from '../src/index.js';

class TelemetryFetchClient extends FetchClient {
  readonly requestPaths: string[] = [];

  static override create(config = {}): TelemetryFetchClient {
    return new this(config);
  }

  protected override onRequest(context: RequestContextType): Promise<RequestContextType> {
    console.log(`[fetch] ${context.metadata.method} ${context.metadata.path}`);
    this.requestPaths.push(context.metadata.path);
    return Promise.resolve(context);
  }

  protected override onResponse(context: ResponseContextType): Promise<ResponseContextType> {
    console.log(`[fetch] <- ${context.response.status}`);
    return Promise.resolve(context);
  }
}

class TelemetryRetry extends Retry {
  readonly scheduledRetries: number[] = [];

  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  protected override onRetryScheduled(context: RetryContextType): void {
    console.log(`[retry] attempt ${context.attemptNumber} scheduled retry`);
    this.scheduledRetries.push(context.attemptNumber);
  }
}

/**
 * Advanced extension: RequestExecutor has no hooks of its own — observability is
 * delegated entirely to the composed primitives. A subclass can still add
 * convenience behavior by reaching the composed instances through the getters.
 */
class ReportingRequestExecutor extends RequestExecutor {
  // `this.create(...)` (not `RequestExecutor.create(...)`) so the inherited factory's
  // `new this(...)` binds to ReportingRequestExecutor — same `new this()` polymorphism
  // FetchClient/Timing/Retry use for their own subclass factories.
  static tracked(fetchClient: TelemetryFetchClient, retry: TelemetryRetry): ReportingRequestExecutor {
    const result = this.create({ 'fetchClient': fetchClient, 'retry': retry }) as ReportingRequestExecutor;
    return result;
  }

  report(): { 'retries': number; 'totalRequests': number } {
    const stats = this.getRetry().getStats();

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

const serverUrl = `http://localhost:${address.port}`;

// #region usage
const fetchClient = TelemetryFetchClient.create({ 'baseURL': serverUrl });
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

// Composed instances stay reachable via getters, even from within the subclass
assert.equal(executor.getFetchClient(), fetchClient);
assert.equal(executor.getRetry(), retry);

server.close();

console.log('observedRequestExecutor: all assertions passed');
