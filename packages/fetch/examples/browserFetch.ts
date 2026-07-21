/** browserFetch — a real HTTP GET over the runtime's native fetch, via a subclass with onRequest/onResponse hooks. Run: npx tsx packages/fetch/examples/browserFetch.ts */

import assert from 'node:assert/strict';

// #region usage
import type { RequestContextInterface, ResponseContextInterface } from '../src/index.js';

import { FetchClient } from '../src/index.js';

// A configured subclass over the runtime's native `fetch`. The undici
// connection-pool dispatcher is a Node-only enhancement (disabled by default),
// so this exact code runs unchanged in the browser.
class TraceClient extends FetchClient {
  static override create(config: Parameters<typeof FetchClient.create>[0] = {}): TraceClient {
    return new this(config);
  }

  requestHookCount = 0;
  responseHookCount = 0;

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    this.requestHookCount += 1;
    const headers: Record<string, string> = context.options.headers ?? {};
    headers['X-Demo-Trace'] = 'substrate-fetch';
    const result: RequestContextInterface = { ...context, 'options': { ...context.options, 'headers': headers } };
    return Promise.resolve(result);
  }

  protected override onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    this.responseHookCount += 1;
    return Promise.resolve(context);
  }
}

await (async function runBrowserFetchExample(): Promise<void> {
  const api = TraceClient.create({
    'baseURL': 'https://jsonplaceholder.typicode.com',
    'timeout': 8000
  });

  console.log('GET https://jsonplaceholder.typicode.com/todos/1 (native fetch + onRequest/onResponse hooks)');

  const response = await api.get('/todos/1');
  const todo: { 'completed': boolean; 'id': number; 'title': string } =
    await response.json() as { 'completed': boolean; 'id': number; 'title': string };

  console.log(`status: ${response.status}`);
  console.log(`onRequest fired ${api.requestHookCount}x, onResponse fired ${api.responseHookCount}x`);
  console.log(`todo #${todo.id}: "${todo.title}" (completed: ${todo.completed})`);

  assert.equal(response.status, 200, 'expected HTTP 200');
  assert.equal(api.requestHookCount, 1, 'onRequest fires once per request');
  assert.equal(api.responseHookCount, 1, 'onResponse fires once per request');
  assert.equal(todo.id, 1, 'fetched todo #1');

  console.log('browserFetch: all assertions passed');
})();
// #endregion usage
