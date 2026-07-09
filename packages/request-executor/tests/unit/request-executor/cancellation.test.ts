/**
 * Verifies a caller-supplied AbortSignal composed together with a deadlineMs
 * aborts the in-flight fetch.
 */

import type { Server } from 'node:http';

import { equal, ok, rejects } from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, it } from 'node:test';

import { AbortError, FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';

import { RequestExecutor } from '../../../src/index.js';

let server: Server;
let serverUrl: string;

before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/delay') {
      const delayMs = Number.parseInt(url.searchParams.get('ms') ?? '200', 10);

      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('delayed');
      }, delayMs);
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

it('a merged caller signal + deadlineMs aborts the in-flight fetch', async () => {
  const controller = new AbortController();

  setTimeout(() => { return controller.abort(); }, 10);

  const executor = RequestExecutor.create({
    'deadlineMs': 5000,
    'fetchClient': FetchClient.create({ 'baseURL': serverUrl }),
    'retry': Retry.create({ 'maxRetries': 0 })
  });

  await rejects(
    executor.execute(
      (client, signal) => { return client.get('/delay?ms=200', { signal }); },
      { 'signal': controller.signal }
    ),
    (error: unknown) => {
      // maxRetries: 0 means Retry#execute wraps the single failed attempt in a
      // MaxRetriesExceededError, with the original AbortError as its `cause`.
      ok(error instanceof Error);
      ok(error.cause instanceof AbortError);
      return true;
    }
  );
});

it('composes the AbortSignal from Signal#compose (never-aborting sentinel when no options given)', async () => {
  const executor = RequestExecutor.create({
    'fetchClient': FetchClient.create({ 'baseURL': serverUrl }),
    'retry': Retry.create()
  });

  const response = await executor.execute((client, signal) => {
    equal(signal.aborted, false);
    return client.get('/delay?ms=10', { signal });
  });

  equal(response.status, 200);
});
