/** 02-interceptors — request and response interceptor pipeline. Run: npx tsx packages/fetch/examples/02-interceptors.ts */

import assert from 'node:assert/strict';

// #region usage
import { FetchClient } from '../src/index.js';

let requestInterceptorCallCount = 0;
let responseInterceptorCallCount = 0;

// Register request interceptors (array) and a single response interceptor.
// PipelineFnType accepts sync returns — async is not required when there is no await.
const api = FetchClient.create({
  'baseURL': 'https://api.example.com',
  'requestInterceptor': [
    (ctx) => {
      requestInterceptorCallCount++;
      // Add a trace header on every request
      const headers: Record<string, string> = ctx.options.headers ?? {};
      headers['X-Trace-ID'] = 'trace-001';
      return { ...ctx, 'options': { ...ctx.options, 'headers': headers } };
    }
  ],
  'responseInterceptor': (ctx) => {
    responseInterceptorCallCount++;
    return ctx;
  }
});

console.log('Interceptor pipeline registered: 1 request interceptor + 1 response interceptor');
console.log('Interceptors fire lazily when a request is dispatched — not at construction time');
// #endregion usage

assert.ok(api instanceof FetchClient, 'Client with interceptors constructs successfully');
// Interceptors are not called at construction time — only when a request is dispatched
assert.strictEqual(requestInterceptorCallCount, 0, 'Request interceptor not yet called');
assert.strictEqual(responseInterceptorCallCount, 0, 'Response interceptor not yet called');

console.log('02-interceptors: all assertions passed');
