/**
 * Verifies Timing#onEvent spans bracket the whole retry loop (all attempts),
 * not each individual attempt.
 */

import type { Server } from 'node:http';

import { equal, ok } from 'node:assert/strict';
import { createServer } from 'node:http';
import { after, before, it } from 'node:test';

import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';
import { Timing } from '@studnicky/timing';

import { RequestExecutor } from '../../../src/index.js';

let server: Server;
let serverUrl: string;
let failuresRemaining = 1;

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

class TrackingTiming extends Timing {
  readonly eventNames: string[] = [];

  protected override onEvent(data: { 'component': string; 'event': string; 'operation': string }): void {
    this.eventNames.push(data.event);
  }
}

it('captures one start/complete Timing span across all retry attempts', async () => {
  failuresRemaining = 1;

  const timing = new TrackingTiming();
  const executor = RequestExecutor.create({
    'fetchClient': FetchClient.create({ 'baseURL': serverUrl }),
    'retry': Retry.create({ 'maxRetries': 2 }),
    'timing': timing
  });

  const response = await executor.execute(async (client, signal) => {
    const result = await client.get('/flaky', { signal });

    if (!result.ok) {
      throw new Error(`HTTP ${result.status}`);
    }

    return result;
  });

  equal(response.status, 200);

  // Only one start/complete pair — the span brackets the whole retry loop, not each attempt.
  equal(timing.eventNames.filter((name) => { return name === 'RequestExecutor.execute.start'; }).length, 1);
  equal(timing.eventNames.filter((name) => { return name === 'RequestExecutor.execute.complete'; }).length, 1);

  const events = timing.getEvents();

  ok('RequestExecutor.execute.start' in events);
  ok('RequestExecutor.execute.complete' in events);
});
