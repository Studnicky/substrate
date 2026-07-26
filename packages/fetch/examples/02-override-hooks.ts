/** 02-override-hooks — subclass FetchClient and override onRequest/onResponse to transform requests and responses. Run: npx tsx packages/fetch/examples/02-override-hooks.ts */

import assert from 'node:assert/strict';

// #region usage
import type { RequestContextInterface, ResponseContextInterface } from '../src/index.js';

import { FetchClient } from '../src/index.js';

/**
 * AuthClient — stamps every outgoing request with an Authorization header.
 *
 * Override onRequest to mutate the request context before the HTTP call.
 * Return the context unchanged in onResponse for a no-op response stage.
 */
class AuthClient extends FetchClient {
  readonly requestLog: string[] = [];
  readonly responseLog: number[] = [];

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    this.requestLog.push(context.url);
    const result: RequestContextInterface = {
      ...context,
      'options': {
        ...context.options,
        'headers': {
          ...context.options.headers,
          'Authorization': 'Bearer example-token',
          'X-Client': 'AuthClient'
        }
      }
    };
    return Promise.resolve(result);
  }

  protected override onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
    this.responseLog.push(context.response.status);
    return Promise.resolve(context);
  }
}

await (async function runOverrideHooksExample(): Promise<void> {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_input, init) => {
    const echoed: Record<string, string> = {};
    for (const [name, value] of new Headers(init?.headers).entries()) {
      echoed[name] = value;
    }

    return Promise.resolve(new Response(JSON.stringify({ 'echoed': echoed }), {
      'headers': { 'Content-Type': 'application/json' },
      'status': 200
    }));
  };

  const client = AuthClient.create({ 'baseURL': 'https://example.test' });

  try {
    const res = await client.get('/check');
    const body = await res.json() as { 'echoed': Record<string, string> };

    assert.ok(client instanceof FetchClient, 'AuthClient is-a FetchClient');
    assert.ok(client instanceof AuthClient, 'instanceof works for subclass');
    assert.strictEqual(client.requestLog.length, 1, 'onRequest fired once');
    assert.ok(client.requestLog[0]?.includes('/check') === true, 'onRequest received the correct url');
    assert.strictEqual(client.responseLog.length, 1, 'onResponse fired once');
    assert.strictEqual(client.responseLog[0], 200, 'onResponse received 200 status');
    assert.strictEqual(body.echoed.authorization, 'Bearer example-token', 'Authorization header was injected');
    assert.strictEqual(body.echoed['x-client'], 'AuthClient', 'X-Client header was injected');

    console.log('02-override-hooks: all assertions passed');
  } finally {
    globalThis.fetch = originalFetch;
  }
})();
// #endregion usage
