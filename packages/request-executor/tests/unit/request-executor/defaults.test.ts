/**
 * Default-construction tests — RequestExecutor.create() with no config
 */

import type { Server } from 'node:http';

import { equal, ok } from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, it } from 'node:test';

import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';
import { Signal } from '@studnicky/signal';

import { RequestExecutor } from '../../../src/index.js';

let server: Server;
let serverUrl: string;

before(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
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

it('produces a working, callable instance with real default primitives', async () => {
  const executor = RequestExecutor.create();

  ok(executor.getFetchClient() instanceof FetchClient);
  ok(executor.getRetry() instanceof Retry);
  ok(executor.getSignal() instanceof Signal);
  equal(executor.getTiming(), undefined);
  equal(executor.getContext(), undefined);

  const response = await executor.execute((client, signal) => {
    return client.get(`${serverUrl}/`, { signal });
  });

  equal(response.status, 200);
  equal(await response.text(), 'ok');
});
