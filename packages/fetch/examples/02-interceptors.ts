/**
 * Request and response interceptor pipeline.
 *
 * Demonstrates: single + array interceptors registered at creation time.
 * Interceptors are accepted without error; they fire when a request is made.
 *
 * Run: npx tsx packages/fetch/examples/02-interceptors.ts
 */
import assert from 'node:assert/strict';

import { FetchClient } from '../src/index.js';

let requestInterceptorCallCount = 0;
let responseInterceptorCallCount = 0;

const api = FetchClient.create({
  baseURL: 'https://api.example.com',
  requestInterceptor: [
    async (ctx) => {
      requestInterceptorCallCount++;
      // Add a trace header on every request
      const headers = ctx.options.headers as Record<string, string> ?? {};
      headers['X-Trace-ID'] = 'trace-001';
      return { ...ctx, options: { ...ctx.options, headers } };
    }
  ],
  responseInterceptor: async (ctx) => {
    responseInterceptorCallCount++;
    return ctx;
  }
});

assert.ok(api instanceof FetchClient, 'Client with interceptors constructs successfully');

// Interceptors are not called at construction time — only when a request is dispatched
assert.strictEqual(requestInterceptorCallCount, 0, 'Request interceptor not yet called');
assert.strictEqual(responseInterceptorCallCount, 0, 'Response interceptor not yet called');

console.log('Interceptor pipeline registered: 1 request interceptor + 1 response interceptor');
console.log('Interceptors fire lazily when a request is dispatched — not at construction time');
