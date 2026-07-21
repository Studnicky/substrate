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
    const requestId = context.get('requestId');
    if (typeof requestId !== 'string') {
      throw new TypeError('Expected requestId context value to be a string');
    }
    observedRequestId = requestId;

    return client.get('/', { signal });
  });

  equal(observedRequestId, 'req-abc-123');
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
      const seed = context.get('seed');
      if (typeof seed !== 'number') {
        throw new TypeError('Expected seed context value to be a number');
      }
      observedSeed = seed;
      return client.get('/', { signal });
    },
    { 'contextInitial': { 'seed': 42 } }
  );

  equal(observedSeed, 42);
});
