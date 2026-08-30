/** observedFetch — FetchClient subclass with exhaustive lifecycle hook tracing. Run: npx tsx examples/observedFetch.ts */

import assert from 'node:assert/strict';

// #region usage
import type { RequestContextInterface, ResponseContextInterface } from '../src/node/index.js';

import { FetchClient } from '../src/node/index.js';

class ObservedFetch extends FetchClient {
  readonly hookLog: string[] = [];

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    console.log(`[fetch] onRequest url=${context.url}`);
    this.hookLog.push('onRequest');
    // Stamp a correlation header on every outgoing request
    const headers: Record<string, string> = context.options.headers ?? {};
    headers['X-Observed'] = 'true';
    const result: RequestContextInterface = { ...context, 'options': { ...context.options, 'headers': headers } };
    const response = Promise.resolve(result);
    return response;
  }

  protected override onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    console.log(`[fetch] onResponse status=${context.response.status}`);
    this.hookLog.push('onResponse');
    const result = Promise.resolve(context);
    return result;
  }

  protected override onRequestStart(method: string, _path: string, requestId: string, url: string): void {
    const line = `[fetch] onRequestStart method=${method} url=${url} requestId=${requestId}`;

    console.log(line);
    this.hookLog.push('onRequestStart');
  }

  protected override onResponseSuccess(method: string, requestId: string, statusCode: number, durationMs: number): void {
    const line = `[fetch] onResponseSuccess method=${method} status=${statusCode} durationMs=${durationMs} requestId=${requestId}`;

    console.log(line);
    this.hookLog.push('onResponseSuccess');
  }

  protected override onResponseError(method: string, requestId: string, statusCode: number, durationMs: number): void {
    const line = `[fetch] onResponseError method=${method} status=${statusCode} durationMs=${durationMs} requestId=${requestId}`;

    console.log(line);
    this.hookLog.push('onResponseError');
  }

  protected override onRequestError(error: Error, method: string, requestId: string, url: string, durationMs: number): void {
    const line = `[fetch] onRequestError method=${method} url=${url} error=${String(error)} durationMs=${durationMs} requestId=${requestId}`;

    console.log(line);
    this.hookLog.push('onRequestError');
  }
}

const originalFetch = globalThis.fetch;
globalThis.fetch = (input) => {
  const url = new URL(String(input));

  if (url.pathname === '/ok') {
    const result = Promise.resolve(new Response(JSON.stringify({ 'status': 'ok' }), {
      'headers': { 'Content-Type': 'application/json' },
      'status': 200
    }));
    return result;
  }

  if (url.pathname === '/error') {
    const result = Promise.resolve(new Response(JSON.stringify({ 'error': 'unavailable' }), {
      'headers': { 'Content-Type': 'application/json' },
      'status': 503
    }));
    return result;
  }

  const result = Promise.resolve(new Response('', { 'status': 404 }));
  return result;
};

const client = ObservedFetch.create({
  'baseURL': 'https://example.test'
});

try {
  // Scenario 1: successful request
  await client.get('/ok');

  // Scenario 2: non-2xx response
  await client.get('/error');
} finally {
  globalThis.fetch = originalFetch;
}
// #endregion usage

// Assertions
assert.ok(client.hookLog.includes('onRequestStart'), 'onRequestStart fired');
assert.ok(client.hookLog.includes('onRequest'), 'onRequest fired');
assert.ok(client.hookLog.includes('onResponse'), 'onResponse fired');
assert.ok(client.hookLog.includes('onResponseSuccess'), 'onResponseSuccess fired for 200');
assert.ok(client.hookLog.includes('onResponseError'), 'onResponseError fired for 503');

console.log('observedFetch: all assertions passed');
