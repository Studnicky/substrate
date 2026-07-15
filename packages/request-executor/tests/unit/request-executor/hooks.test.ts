/**
 * Verifies subclassed FetchClient and Retry lifecycle hooks still fire when
 * composed through RequestExecutor#execute() against a flaky local server.
 */

import type { Server } from 'node:http';

import { deepEqual, equal } from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, it } from 'node:test';

import type { RequestContextType, ResponseContextType } from '@studnicky/fetch/types';
import type { ErrorClassificationType, RetryConfigInterface, RetryContextType } from '@studnicky/retry';

import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';

import { RequestExecutor } from '../../../src/index.js';

let server: Server;
let serverUrl: string;
let failuresRemaining = 2;

before(async () => {
  server = createServer((req, res) => {
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
    server.listen(0, () => {
      const address = server.address();

      if (address !== null && typeof address === 'object') {
        serverUrl = `http://localhost:${address.port}`;
        resolve();
      }
    });
  });
});

after(() => {
  server.close();
});

class TrackingFetchClient extends FetchClient {
  readonly requestPaths: string[] = [];
  readonly responseStatuses: number[] = [];

  static override create(config = {}): TrackingFetchClient {
    return new this(config);
  }

  protected override async onRequest(context: RequestContextType): Promise<RequestContextType> {
    this.requestPaths.push(context.metadata.path);
    return context;
  }

  protected override async onResponse(context: ResponseContextType): Promise<ResponseContextType> {
    this.responseStatuses.push(context.response.status);
    return context;
  }
}

class TrackingRetry extends Retry {
  readonly attempts: number[] = [];
  readonly scheduledRetries: number[] = [];

  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  protected override classifyError(_error: Error, _attemptNumber: number): ErrorClassificationType {
    return { 'retryable': true };
  }

  protected override onAttempt(attemptNumber: number): void {
    this.attempts.push(attemptNumber);
  }

  protected override onRetryScheduled(context: RetryContextType): void {
    this.scheduledRetries.push(context.attemptNumber);
  }
}

it('fires subclass FetchClient and Retry hooks through the composed execute() call', async () => {
  failuresRemaining = 2;

  const fetchClient = TrackingFetchClient.create({ 'baseURL': serverUrl });
  const retry = new TrackingRetry({ 'maxRetries': 3 });

  const executor = RequestExecutor.create({ 'fetchClient': fetchClient, 'retry': retry });

  const response = await executor.execute(async (client, signal) => {
    const result = await client.get('/flaky', { signal });

    if (!result.ok) {
      throw new Error(`HTTP ${result.status}`);
    }

    return result;
  });

  equal(response.status, 200);
  equal(await response.text(), 'ok');

  deepEqual(fetchClient.requestPaths, ['/flaky', '/flaky', '/flaky']);
  deepEqual(fetchClient.responseStatuses, [500, 500, 200]);

  deepEqual(retry.attempts, [0, 1, 2]);
  deepEqual(retry.scheduledRetries, [0, 1]);
});
