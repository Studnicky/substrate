/** directComposition — hand-composes FetchClient, Retry, Signal, and Context directly,
 * without RequestExecutor, to show the same one-shot request execution pattern built from its
 * four primitives by hand, including the lifecycle hook points RequestExecutor brackets the
 * retry loop with. Compare with observedRequestExecutor.ts, which does identical work through
 * the kit. Run: npx tsx examples/directComposition.ts */

// #region usage
import { Context } from '@studnicky/context';
import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';
import { Signal } from '@studnicky/signal';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

import type { RequestDeadlineEntity } from '../src/entities/index.js';

interface ExecuteOptionsInterface<T> {
  'deadlineMs'?: RequestDeadlineEntity.Type['deadlineMs'];
  'onExecuteComplete'?: (result: T) => void;
  'onExecuteError'?: (error: unknown) => void;
  'onExecuteStart'?: () => void;
}

/**
 * The same composition order RequestExecutor#execute() uses internally: a context scope
 * wraps the whole call, `onExecuteStart`/`onExecuteComplete`/`onExecuteError` bracket the
 * retry loop, the retry loop wraps the caller's callback, and the composed cancellation signal
 * threads through into whatever call callback makes. Nothing here is hidden inside a facade class —
 * every primitive is a plain local variable the caller owns, and the lifecycle hooks are plain
 * callbacks rather than protected methods to override.
 */
class Directly {
  static async execute<T>(
    fetchClient: FetchClient,
    retry: Retry,
    signal: Signal,
    context: Context,
    callback: (client: FetchClient, abortSignal: AbortSignal) => Promise<T>,
    options: ExecuteOptionsInterface<T> = {}
  ): Promise<T> {
    const composedSignal = await signal.compose(
      options.deadlineMs !== undefined ? { 'deadlineMs': options.deadlineMs } : {}
    );

    const scope = context.initialize();

    try {
      const result = await scope.execute(async () => {
        options.onExecuteStart?.();

        try {
          const attemptResult = await retry.execute(() => { const result = callback(fetchClient, composedSignal); return result; });

          options.onExecuteComplete?.(attemptResult);

          return attemptResult;
        } catch (error) {
          options.onExecuteError?.(error);
          throw error;
        }
      });

      return result;
    } finally {
      scope.terminate();
    }
  }
}
// #endregion usage

class LifecycleLog {
  static readonly entries: string[] = [];
}

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
const fetchClient = FetchClient.create({ 'baseURL': `http://localhost:${address.port}` });
const retry = Retry.create({ 'maximumRetries': 3 });
const signal = Signal.create();
const context = Context.create({ 'name': 'directComposition' });

const response = await Directly.execute(
  fetchClient,
  retry,
  signal,
  context,
  async (client, abortSignal) => {
    const result = await client.get('/flaky', { 'signal': abortSignal });

    if (!result.ok) {
      throw new Error(`HTTP ${result.status}`);
    }

    return result;
  },
  {
    'deadlineMs': 5000,
    'onExecuteComplete': (result) => { LifecycleLog.entries.push(`complete:${result.status}`); },
    'onExecuteStart': () => { LifecycleLog.entries.push('start'); }
  }
);

console.log('Response status:', response.status);
console.log('Lifecycle events:', LifecycleLog.entries);
// #endregion usage

assert.equal(response.status, 200);
assert.equal(await response.text(), 'ok');
assert.equal(retry.getStats().totalRetries, 2);
assert.equal(retry.getStats().successfulRequests, 1);
assert.deepEqual(LifecycleLog.entries, ['start', 'complete:200']);

server.close();

console.log('directComposition: all assertions passed');
