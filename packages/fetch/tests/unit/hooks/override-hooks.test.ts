/**
 * Proves that subclassing FetchClient and overriding onRequest/onResponse
 * transforms the outgoing request and incoming response, and that an
 * un-subclassed client is unaffected.
 */

import type { Server } from 'node:http';

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  after, before, describe, it
} from 'node:test';

import type { RequestContextInterface } from '../../../src/interfaces/RequestContextInterface.js';
import type { ResponseContextInterface } from '../../../src/interfaces/ResponseContextInterface.js';

import { FetchClient } from '../../../src/index.js';

let server: Server;
let baseURL: string;

void before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/echo-headers') {
      const headers: Record<string, string> = {};

      for (const [name, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') {
          headers[name] = value;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 'headers': headers }));
      return;
    }

    if (url.pathname === '/ok') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 'value': 'original' }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();

      if (addr !== null && typeof addr === 'object') {
        baseURL = `http://127.0.0.1:${addr.port}`;
        resolve();
      }
    });
  });
});

void after(() => {
  server.close();
});

void describe('onRequest hook override', () => {
  void it('transforms outgoing request by injecting a header', async () => {
    class HeaderInjectClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): HeaderInjectClient {
        return new this(config);
      }

      protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
        return {
          ...context,
          'options': {
            ...context.options,
            'headers': {
              ...context.options.headers,
              'X-Injected': 'hook-value'
            }
          }
        };
      }
    }

    const client = HeaderInjectClient.create({ 'baseURL': baseURL });
    const response = await client.get('/echo-headers');
    const data = await response.json() as { 'headers': Record<string, string> };

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.headers['x-injected'], 'hook-value');
  });

  void it('transforms the request URL', async () => {
    const visitedUrls: string[] = [];

    class UrlRewriteClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): UrlRewriteClient {
        return new this(config);
      }

      protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
        visitedUrls.push(context.url);
        return { ...context, 'url': context.url.replace('/original-path', '/ok') };
      }
    }

    const client = UrlRewriteClient.create({ 'baseURL': baseURL });
    const response = await client.get('/original-path');

    assert.strictEqual(response.status, 200);
    assert.ok(visitedUrls[0]?.includes('/original-path'), 'onRequest received the original URL');
  });

  void it('base class onRequest returns context unchanged (identity default)', async () => {
    const client = FetchClient.create({ 'baseURL': baseURL });
    const response = await client.get('/echo-headers');
    const data = await response.json() as { 'headers': Record<string, string> };

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.headers['x-injected'], undefined, 'No header injected on base client');
  });
});

void describe('onResponse hook override', () => {
  void it('transforms the response returned to the caller', async () => {
    class ResponseWrapClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): ResponseWrapClient {
        return new this(config);
      }

      protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
        // Replace the response with a new one that has an extra header
        const body = await context.response.text();
        const wrapped = new Response(body, {
          'headers': {
            'Content-Type': 'application/json',
            'X-Transformed': 'yes'
          },
          'status': context.response.status
        });
        return { ...context, 'response': wrapped };
      }
    }

    const client = ResponseWrapClient.create({ 'baseURL': baseURL });
    const response = await client.get('/ok');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers.get('x-transformed'), 'yes');
  });

  void it('can reject a request by throwing from onResponse', async () => {
    class StrictClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): StrictClient {
        return new this(config);
      }

      protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
        if (!context.response.ok) {
          throw new Error(`HTTP error: ${context.response.status}`);
        }
        return context;
      }
    }

    const client = StrictClient.create({ 'baseURL': baseURL });

    await assert.rejects(
      async () => {
        await client.get('/nonexistent');
      },
      (error: Error) => {
        assert.ok(error.message.includes('HTTP error: 404'));
        return true;
      }
    );
  });

  void it('base class onResponse returns context unchanged (identity default)', async () => {
    const client = FetchClient.create({ 'baseURL': baseURL });
    const response = await client.get('/ok');
    const data = await response.json() as { 'value': string };

    assert.strictEqual(response.status, 200);
    assert.strictEqual(data.value, 'original');
    assert.strictEqual(response.headers.get('x-transformed'), null, 'No transform on base client');
  });

  void it('receives request metadata in the response context', async () => {
    const capturedRequestIds: string[] = [];

    class MetadataClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): MetadataClient {
        return new this(config);
      }

      protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
        capturedRequestIds.push(context.request.requestId);
        return context;
      }
    }

    const client = MetadataClient.create({ 'baseURL': baseURL });
    await client.get('/ok');

    assert.strictEqual(capturedRequestIds.length, 1);
    assert.ok(
      typeof capturedRequestIds[0] === 'string' && capturedRequestIds[0].length > 0,
      'requestId is a non-empty string'
    );
  });
});

void describe('onRequest and onResponse hooks combined', () => {
  void it('both hooks fire in sequence and both transform the pipeline', async () => {
    const log: string[] = [];

    class PipelineClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): PipelineClient {
        return new this(config);
      }

      protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
        log.push('onRequest');
        return {
          ...context,
          'options': {
            ...context.options,
            'headers': { ...context.options.headers, 'X-Pipeline': 'request-stage' }
          }
        };
      }

      protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
        log.push('onResponse');
        return context;
      }
    }

    const client = PipelineClient.create({ 'baseURL': baseURL });
    const response = await client.get('/echo-headers');
    const data = await response.json() as { 'headers': Record<string, string> };

    assert.deepStrictEqual(log, ['onRequest', 'onResponse']);
    assert.strictEqual(data.headers['x-pipeline'], 'request-stage');
  });
});
