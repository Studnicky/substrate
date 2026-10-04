import type { SignalComposeOptionsInterface } from '@studnicky/signal/interfaces';

// #region usage
/** resilientRequestComposition — composes FetchClient, Retry, and Signal directly while keeping every caller-owned primitive visible. Run: npx tsx examples/resilientRequestComposition.ts */
import { RuntimeError } from '@studnicky/errors/node';
import { FetchClient } from '@studnicky/fetch/node';
import { Retry } from '@studnicky/resilience/retry/node';
import { Signal } from '@studnicky/signal/node';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

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
  throw RuntimeError.create('failed to determine server address');
}

// #region usage
const fetchClient = FetchClient.create({ 'baseURL': `http://localhost:${address.port}` });
const retry = Retry.create({
  'errorClassifier': () => {return { 'retryable': true };},
  'maximumRetries': 3
});
const signal = Signal.create();

const response = await (async (): Promise<Response> => {
  const options: SignalComposeOptionsInterface = { 'deadlineMs': 5000 };
  using composed = await signal.compose(
    options.deadlineMs === undefined ? {} : { 'deadlineMs': options.deadlineMs }
  );
  const result = await retry.execute(async (): Promise<Response> => {
    const attempt = await fetchClient.get('/flaky', { 'signal': composed.signal });

    if (!attempt.ok) {
      throw RuntimeError.create(`HTTP ${attempt.status}`);
    }

    return attempt;
  });

  return result;
})();

console.log('Response status:', response.status);
// #endregion usage

assert.equal(response.status, 200);
assert.equal(await response.text(), 'ok');
assert.equal(retry.getStats().totalRetries, 2);
assert.equal(retry.getStats().successfulRequests, 1);

server.close();

console.log('resilientRequestComposition: all assertions passed');
