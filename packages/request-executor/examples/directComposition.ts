/** directComposition — hand-composes FetchClient, Retry, Signal, Timing, and Context directly,
 * without RequestExecutor, to show the same one-shot request execution pattern built from its
 * five primitives by hand. Compare with observedRequestExecutor.ts, which does identical work
 * through the kit. Run: npx tsx examples/directComposition.ts */

// #region usage
import { Context } from '@studnicky/context';
import { FetchClient } from '@studnicky/fetch';
import { Retry } from '@studnicky/retry';
import { Signal } from '@studnicky/signal';
import { Timing, TIMING_STATUS, TimingEvent } from '@studnicky/timing';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

/**
 * The same composition order RequestExecutor#execute() uses internally: a context scope
 * wraps the whole call, a timing span brackets the retry loop, the retry loop wraps the
 * caller's fn, and the composed cancellation signal threads through into whatever call
 * fn makes. Nothing here is hidden inside a facade class — every primitive is a plain
 * local variable the caller owns.
 */
class Directly {
  static async execute<T>(
    fetchClient: FetchClient,
    retry: Retry,
    signal: Signal,
    timing: Timing,
    context: Context,
    fn: (client: FetchClient, abortSignal: AbortSignal) => Promise<T>,
    options: { 'deadlineMs'?: number } = {}
  ): Promise<T> {
    const composedSignal = signal.compose(
      options.deadlineMs !== undefined ? { 'deadlineMs': options.deadlineMs } : {}
    );

    const scope = context.initialize();

    try {
      const result = await scope.execute(async () => {
        timing.event(
          TimingEvent.create().component('directComposition').operation('execute').status(TIMING_STATUS.START).build()
        );

        try {
          const attemptResult = await retry.execute(() => { const result = fn(fetchClient, composedSignal); return result; });

          timing.event(
            TimingEvent.create().component('directComposition').operation('execute').status(TIMING_STATUS.COMPLETE).build()
          );

          return attemptResult;
        } catch (error) {
          timing.event(
            TimingEvent.create().component('directComposition').operation('execute').status(TIMING_STATUS.ERROR).build()
          );
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
const retry = Retry.create({ 'maxRetries': 3 });
const signal = Signal.create();
const timing = Timing.create();
const context = Context.create({ 'name': 'directComposition' });

const response = await Directly.execute(
  fetchClient,
  retry,
  signal,
  timing,
  context,
  async (client, abortSignal) => {
    const result = await client.get('/flaky', { 'signal': abortSignal });

    if (!result.ok) {
      throw new Error(`HTTP ${result.status}`);
    }

    return result;
  },
  { 'deadlineMs': 5000 }
);

console.log('Response status:', response.status);
console.log('Timing events:', timing.getEvents());
// #endregion usage

assert.equal(response.status, 200);
assert.equal(await response.text(), 'ok');
assert.equal(retry.getStats().totalRetries, 2);
assert.equal(retry.getStats().successfulRequests, 1);

server.close();

console.log('directComposition: all assertions passed');
