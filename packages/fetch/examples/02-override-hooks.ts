/** 02-override-hooks — subclass FetchClient and override onRequest/onResponse to transform requests and responses. Run: npx tsx packages/fetch/examples/02-override-hooks.ts */

import assert from 'node:assert/strict';
import { createServer } from 'node:http';

// #region usage
import type { RequestContextType } from '../src/types/RequestContextType.js';
import type { ResponseContextType } from '../src/types/ResponseContextType.js';

import { FetchClient } from '../src/index.js';

/**
 * AuthClient — stamps every outgoing request with an Authorization header.
 *
 * Override onRequest to mutate the request context before the HTTP call.
 * Return the context unchanged in onResponse for a no-op response stage.
 */
class AuthClient extends FetchClient {
  static override create(config: Parameters<typeof FetchClient.create>[0] = {}): AuthClient {
    return new this(config);
  }

  readonly requestLog: string[] = [];
  readonly responseLog: number[] = [];

  protected override onRequest(context: RequestContextType): Promise<RequestContextType> {
    this.requestLog.push(context.url);
    const result: RequestContextType = {
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

  protected override onResponse(context: ResponseContextType): Promise<ResponseContextType> {
    this.responseLog.push(context.response.status);
    return Promise.resolve(context);
  }
}

await (async function runOverrideHooksExample(): Promise<void> {
  // Start an in-process server that echoes received headers back in the response body
  const server = createServer((req, res) => {
    const headers: Record<string, string> = {};
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[name] = value;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 'echoed': headers }));
  });

  const baseURL = await new Promise<string>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve(`http://127.0.0.1:${(addr as { 'port': number }).port}`);
    });
  });

  const client = AuthClient.create({ 'baseURL': baseURL });

  const res = await client.get('/check');
  const body = await res.json() as { 'echoed': Record<string, string> };

  server.close();

  assert.ok(client instanceof FetchClient, 'AuthClient is-a FetchClient');
  assert.ok(client instanceof AuthClient, 'instanceof works for subclass');
  assert.strictEqual(client.requestLog.length, 1, 'onRequest fired once');
  assert.ok(client.requestLog[0]?.includes('/check') === true, 'onRequest received the correct url');
  assert.strictEqual(client.responseLog.length, 1, 'onResponse fired once');
  assert.strictEqual(client.responseLog[0], 200, 'onResponse received 200 status');
  assert.strictEqual(body.echoed.authorization, 'Bearer example-token', 'Authorization header was injected');
  assert.strictEqual(body.echoed['x-client'], 'AuthClient', 'X-Client header was injected');

  console.log('02-override-hooks: all assertions passed');
})();
// #endregion usage
