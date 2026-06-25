/** observedFetch — FetchClient subclass with exhaustive lifecycle hook tracing. Run: npx tsx examples/observedFetch.ts */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';

// #region usage
import type { RequestInterceptorContextType } from '../src/interfaces/RequestInterceptorContextType.js';
import type { ResponseInterceptorContextType } from '../src/interfaces/ResponseInterceptorContextType.js';

import { FetchClient } from '../src/index.js';

// Start an in-process server
const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/ok') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 'status': 'ok' }));
  } else if (url.pathname === '/error') {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 'error': 'unavailable' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const baseURL = await new Promise<string>((resolve) => {
  server.listen(0, '127.0.0.1', () => {
    const addr = server.address();

    resolve(`http://127.0.0.1:${(addr as { 'port': number }).port}`);
  });
});

class ObservedFetch extends FetchClient {
  static override create(config: Parameters<typeof FetchClient.create>[0] = {}): ObservedFetch {
    return new this(config);
  }

  readonly hookLog: string[] = [];

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

  protected override onRequestError(error: unknown, method: string, requestId: string, url: string, durationMs: number): void {
    const line = `[fetch] onRequestError method=${method} url=${url} error=${String(error)} durationMs=${durationMs} requestId=${requestId}`;

    console.log(line);
    this.hookLog.push('onRequestError');
  }

  protected override onRequestIntercept(index: number, context: RequestInterceptorContextType): void {
    console.log(`[fetch] onRequestIntercept index=${index} url=${context.url}`);
    this.hookLog.push(`onRequestIntercept:${index}`);
  }

  protected override onResponseIntercept(index: number, context: ResponseInterceptorContextType): void {
    console.log(`[fetch] onResponseIntercept index=${index} status=${context.response.status}`);
    this.hookLog.push(`onResponseIntercept:${index}`);
  }

  protected override onDispatcherDestroy(): void {
    console.log('[fetch] onDispatcherDestroy');
    this.hookLog.push('onDispatcherDestroy');
  }
}

const client = ObservedFetch.create({
  'baseURL': baseURL,
  'dispatcher': { 'connections': 2, 'enabled': true },
  'requestInterceptor': (ctx) => {
    // Stamp a correlation header on every outgoing request
    const headers: Record<string, string> = ctx.options.headers ?? {};

    headers['X-Observed'] = 'true';
    return { ...ctx, 'options': { ...ctx.options, 'headers': headers } };
  },
  'responseInterceptor': (ctx) => {
    // Log the response status via the hook seam; nothing to mutate here
    console.log(`[fetch] responseInterceptor status=${ctx.response.status}`);
    return ctx;
  }
});

// Scenario 1: successful request
await client.get('/ok');

// Scenario 2: non-2xx response
await client.get('/error');

// Scenario 3: destroy
await client.destroy();
// #endregion usage

// Assertions
server.close();

assert.ok(client.hookLog.includes('onRequestStart'), 'onRequestStart fired');
assert.ok(client.hookLog.includes('onResponseSuccess'), 'onResponseSuccess fired for 200');
assert.ok(client.hookLog.includes('onResponseError'), 'onResponseError fired for 503');
assert.ok(client.hookLog.includes('onRequestIntercept:0'), 'onRequestIntercept fired');
assert.ok(client.hookLog.includes('onResponseIntercept:0'), 'onResponseIntercept fired');
assert.ok(client.hookLog.includes('onDispatcherDestroy'), 'onDispatcherDestroy fired');

console.log('observedFetch: all assertions passed');
