/** browserFetch — a real HTTP GET over the runtime's native fetch, with interceptors and a timeout. Run: npx tsx packages/fetch/examples/browserFetch.ts */

import assert from 'node:assert/strict';

// #region usage
import { FetchClient } from '../src/index.js';

let requestHookCount = 0;
let responseHookCount = 0;

// A configured client over the runtime's native `fetch`. The undici
// connection-pool dispatcher is a Node-only enhancement (disabled by default),
// so this exact code runs unchanged in the browser.
const api = FetchClient.create({
  'baseURL': 'https://jsonplaceholder.typicode.com',
  'requestInterceptor': (ctx) => {
    requestHookCount += 1;
    const headers: Record<string, string> = ctx.options.headers ?? {};
    headers['X-Demo-Trace'] = 'substrate-fetch';
    return { ...ctx, 'options': { ...ctx.options, 'headers': headers } };
  },
  'responseInterceptor': (ctx) => {
    responseHookCount += 1;
    return ctx;
  },
  'timeout': 8000
});

console.log('GET https://jsonplaceholder.typicode.com/todos/1 (native fetch + interceptors)');

const response = await api.get('/todos/1');
const todo: { 'completed': boolean; 'id': number; 'title': string } =
  await response.json() as { 'completed': boolean; 'id': number; 'title': string };

console.log(`status: ${response.status}`);
console.log(`request interceptor fired ${requestHookCount}x, response interceptor fired ${responseHookCount}x`);
console.log(`todo #${todo.id}: "${todo.title}" (completed: ${todo.completed})`);
// #endregion usage

assert.equal(response.status, 200, 'expected HTTP 200');
assert.equal(requestHookCount, 1, 'request interceptor fires once per request');
assert.equal(responseHookCount, 1, 'response interceptor fires once per request');
assert.equal(todo.id, 1, 'fetched todo #1');

console.log('browserFetch: all assertions passed');
