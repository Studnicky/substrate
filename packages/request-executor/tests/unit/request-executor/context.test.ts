/**
 * Verifies Context/ContextScope correlation is held across the whole execute() call.
 */

import type { Server } from 'node:http';

import { equal } from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, it } from 'node:test';

import { Context } from '@studnicky/context';
import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';

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

it('round-trips a value set/get inside fn through the composed Context instance', async () => {
  const context = Context.create({ 'name': 'context-test' });

  const executor = RequestExecutor.create({
    'context': context,
    'fetchClient': FetchClient.create({ 'baseURL': serverUrl }),
    'retry': Retry.create()
  });

  let observedRequestId: string | undefined;

  await executor.execute(async (client, signal) => {
    context.set('requestId', 'req-abc-123');
    observedRequestId = context.get<string>('requestId');

    return client.get('/', { signal });
  });

  equal(observedRequestId, 'req-abc-123');
  equal(executor.getContext(), context);
});

it('seeds contextInitial values reachable from fn', async () => {
  const context = Context.create({ 'name': 'context-seed-test' });

  const executor = RequestExecutor.create({
    'context': context,
    'fetchClient': FetchClient.create({ 'baseURL': serverUrl }),
    'retry': Retry.create()
  });

  let observedSeed: number | undefined;

  await executor.execute(
    async (client, signal) => {
      observedSeed = context.get<number>('seed');
      return client.get('/', { signal });
    },
    { 'contextInitial': { 'seed': 42 } }
  );

  equal(observedSeed, 42);
});
