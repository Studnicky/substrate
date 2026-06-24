import type { FetchClientInterface } from '../../../src/interfaces/FetchClientInterface.js';
import type { RequestInterceptorType } from '../../../src/types/RequestInterceptorType.js';
import type { ResponseInterceptorType } from '../../../src/types/ResponseInterceptorType.js';

import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { RequestBuilder } from '../../../src/modules/RequestBuilder.js';

// Module-level passthrough interceptors for testing accumulation
const passthroughRequestInterceptor1: RequestInterceptorType = async ({
  metadata, options, url
}) => {
  return {
    metadata,
    options,
    url
  };
};

const passthroughRequestInterceptor2: RequestInterceptorType = async ({
  metadata, options, url
}) => {
  return {
    metadata,
    options,
    url
  };
};

const passthroughResponseInterceptor1: ResponseInterceptorType = async ({
  request, response
}) => {
  return {
    request,
    response
  };
};

const passthroughResponseInterceptor2: ResponseInterceptorType = async ({
  request, response
}) => {
  return {
    request,
    response
  };
};

/**
 * Mock client type for RequestBuilder tests
 */
type MockClient = FetchClientInterface;

const createMockClient = (handlers: {
  'delete'?: (path: string, options?: unknown) => Promise<Response>;
  'get'?: (path: string, options?: unknown) => Promise<Response>;
  'head'?: (path: string, options?: unknown) => Promise<Response>;
  'options'?: (path: string, options?: unknown) => Promise<Response>;
  'patch'?: (path: string, options?: { body?: unknown } & Record<string, unknown>) => Promise<Response>;
  'post'?: (path: string, options?: { body?: unknown } & Record<string, unknown>) => Promise<Response>;
  'put'?: (path: string, options?: { body?: unknown } & Record<string, unknown>) => Promise<Response>;
} = {}): MockClient => {
  return {
    delete: handlers.delete ?? (async () => {
      return new Response();
    }),
    destroy: async () => {
      // No-op for mock
    },
    get: handlers.get ?? (async () => {
      return new Response();
    }),
    head: handlers.head ?? (async () => {
      return new Response();
    }),
    options: handlers.options ?? (async () => {
      return new Response();
    }),
    patch: handlers.patch ?? (async () => {
      return new Response();
    }),
    post: handlers.post ?? (async () => {
      return new Response();
    }),
    put: handlers.put ?? (async () => {
      return new Response();
    }),
    request: (() => {
      throw new Error('Mock request not implemented');
    }) as unknown as FetchClientInterface['request']
  };
};

void describe('RequestBuilder', () => {
  void describe('body configuration', () => {
    void it('should set JSON body with object', async () => {
      let capturedBody: unknown;
      const client = createMockClient({
        post: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const data = {
        age: 30,
        name: 'John'
      };

      await builder.body(data).post();
      assert.deepStrictEqual(capturedBody, data);
    });

    void it('should set string body', async () => {
      let capturedBody: unknown;
      const client = createMockClient({
        post: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const textData = 'plain text body';

      await builder.body(textData).post();
      assert.strictEqual(capturedBody, textData);
    });

    void it('should set Buffer body', async () => {
      let capturedBody: unknown;
      const client = createMockClient({
        post: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const buffer = Buffer.from('binary data');

      await builder.body(buffer).post();
      assert.strictEqual(capturedBody, buffer);
    });

    void it('should set null body', async () => {
      let capturedBody: unknown = 'not-set';
      const client = createMockClient({
        post: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.body(null).post();
      assert.strictEqual(capturedBody, null);
    });

    void it('should set undefined body', async () => {
      let capturedBody: unknown = 'not-set';
      const client = createMockClient({
        post: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.body(undefined).post();
      assert.strictEqual(capturedBody, undefined);
    });

    void it('should support json() as alias for body()', async () => {
      let capturedBody: unknown;
      const client = createMockClient({
        post: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const data = { key: 'value' };

      await builder.json(data).post();
      assert.deepStrictEqual(capturedBody, data);
    });

    void it('should override body when set multiple times', async () => {
      let capturedBody: unknown;
      const client = createMockClient({
        post: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .body({ first: 'body' })
        .body({ second: 'body' })
        .post();

      assert.deepStrictEqual(capturedBody, { second: 'body' });
    });
  });

  void describe('metadata configuration', () => {
    void it('should set metadata', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.metadata({ operation: 'fetchUsers' }).get();

      assert.deepStrictEqual((capturedOptions as { 'metadata'?: unknown }).metadata, { operation: 'fetchUsers' });
    });

    void it('should merge metadata', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .metadata({ operation: 'fetchUsers' })
        .metadata({ source: 'dashboard' })
        .get();

      assert.deepStrictEqual((capturedOptions as { 'metadata'?: unknown }).metadata, {
        operation: 'fetchUsers',
        source: 'dashboard'
      });
    });

    void it('should override metadata keys', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .metadata({ operation: 'first' })
        .metadata({ operation: 'second' })
        .get();

      assert.deepStrictEqual((capturedOptions as { 'metadata'?: unknown }).metadata, { operation: 'second' });
    });

    void it('should handle undefined metadata', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.get();

      assert.strictEqual((capturedOptions as { 'metadata'?: unknown }).metadata, undefined);
    });

    void it('should support nested metadata objects', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.metadata({
        context: {
          tenant: 'acme',
          userId: 123
        },
        operation: 'fetchUsers'
      }).get();

      assert.deepStrictEqual((capturedOptions as { 'metadata'?: unknown }).metadata, {
        context: {
          tenant: 'acme',
          userId: 123
        },
        operation: 'fetchUsers'
      });
    });
  });

  void describe('requestId configuration', () => {
    void it('should set custom request ID', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const customId = 'req_custom_123';

      await builder.requestId(customId).get();

      assert.strictEqual((capturedOptions as { 'requestId'?: string }).requestId, customId);
    });

    void it('should override auto-generated ID', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .requestId('first_id')
        .requestId('second_id')
        .get();

      assert.strictEqual((capturedOptions as { 'requestId'?: string }).requestId, 'second_id');
    });

    void it('should handle undefined requestId when not set', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.get();

      assert.strictEqual((capturedOptions as { 'requestId'?: string }).requestId, undefined);
    });
  });

  void describe('signal configuration', () => {
    void it('should set abort signal', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const controller = new AbortController();

      await builder.signal(controller.signal).get();

      assert.strictEqual((capturedOptions as { 'signal'?: AbortSignal }).signal, controller.signal);
    });

    void it('should respect external signal', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const controller = new AbortController();

      await builder.signal(controller.signal).get();

      assert.strictEqual(
        (capturedOptions as { 'signal'?: AbortSignal }).signal?.aborted,
        false
      );
    });

    void it('should override signal when set multiple times', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const controller1 = new AbortController();
      const controller2 = new AbortController();

      await builder
        .signal(controller1.signal)
        .signal(controller2.signal)
        .get();

      assert.strictEqual((capturedOptions as { 'signal'?: AbortSignal }).signal, controller2.signal);
    });

    void it('should handle undefined signal when not set', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.get();

      assert.strictEqual((capturedOptions as { 'signal'?: AbortSignal }).signal, undefined);
    });
  });

  void describe('queryString with repeated keys', () => {
    const scenarios = [
      {
        calls: [
          [
            'tag',
            'foo'
          ],
          [
            'tag',
            'bar'
          ]
        ] as Array<[string, string]>,
        description: 'repeated scalar values',
        expected: '?tag=foo&tag=bar'
      },
      {
        calls: [
          [
            'tag',
            [
              'foo',
              'bar'
            ]
          ],
          [
            'tag',
            'baz'
          ]
        ] as Array<[string, string | string[]]>,
        description: 'array then scalar',
        expected: '?tag=foo&tag=bar&tag=baz'
      },
      {
        calls: [
          [
            'tag',
            'foo'
          ],
          [
            'tag',
            [
              'bar',
              'baz'
            ]
          ]
        ] as Array<[string, string | string[]]>,
        description: 'scalar then array',
        expected: '?tag=foo&tag=bar&tag=baz'
      },
      {
        calls: [
          [
            'tag',
            [
              'foo',
              'bar'
            ]
          ],
          [
            'tag',
            [
              'baz',
              'qux'
            ]
          ]
        ] as Array<[string, string[]]>,
        description: 'array then array',
        expected: '?tag=foo&tag=bar&tag=baz&tag=qux'
      },
      {
        calls: [
          [
            'filter',
            'active'
          ],
          [
            'tag',
            'foo'
          ],
          [
            'tag',
            'bar'
          ]
        ] as Array<[string, string]>,
        description: 'mixed keys with repetition',
        expected: '?filter=active&tag=foo&tag=bar'
      }
    ];

    for (const scenario of scenarios) {
      void it(`should handle ${scenario.description}`, async () => {
        let capturedPath: string | undefined;
        const client = createMockClient({
          get: async (path) => {
            capturedPath = path;

            return new Response();
          }
        });

        const builder = new RequestBuilder(client, '/test');

        for (const [
          key,
          value
        ] of scenario.calls) {
          builder.queryString(key, value);
        }

        await builder.get();
        assert.strictEqual(capturedPath, `/test${scenario.expected}`);
      });
    }

    void it('should handle number values', async () => {
      let capturedPath: string | undefined;
      const client = createMockClient({
        get: async (path) => {
          capturedPath = path;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .queryString('page', 1)
        .queryString('limit', 10)
        .get();

      assert.strictEqual(capturedPath, '/test?page=1&limit=10');
    });

    void it('should handle boolean values', async () => {
      let capturedPath: string | undefined;
      const client = createMockClient({
        get: async (path) => {
          capturedPath = path;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .queryString('active', true)
        .queryString('deleted', false)
        .get();

      assert.strictEqual(capturedPath, '/test?active=true&deleted=false');
    });

    void it('should handle null values', async () => {
      let capturedPath: string | undefined;
      const client = createMockClient({
        get: async (path) => {
          capturedPath = path;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .queryString('filter', null)
        .get();

      assert.strictEqual(capturedPath, '/test');
    });

    void it('should handle undefined values', async () => {
      let capturedPath: string | undefined;
      const client = createMockClient({
        get: async (path) => {
          capturedPath = path;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.queryString('filter', undefined).get();

      assert.strictEqual(capturedPath, '/test');
    });

    void it('should handle empty array', async () => {
      let capturedPath: string | undefined;
      const client = createMockClient({
        get: async (path) => {
          capturedPath = path;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .queryString('tags', [])
        .get();

      assert.strictEqual(capturedPath, '/test');
    });
  });

  void describe('headers configuration', () => {
    void it('should set single header', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.header('Authorization', 'Bearer token').get();

      assert.deepStrictEqual((capturedOptions as { 'headers'?: Record<string, string> }).headers, { Authorization: 'Bearer token' });
    });

    void it('should set multiple headers via multiple calls', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .header('Authorization', 'Bearer token')
        .header('Content-Type', 'application/json')
        .get();

      assert.deepStrictEqual((capturedOptions as { 'headers'?: Record<string, string> }).headers, {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json'
      });
    });

    void it('should set multiple headers via headers()', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.headers({
        Authorization: 'Bearer token',
        'Content-Type': 'application/json'
      }).get();

      assert.deepStrictEqual((capturedOptions as { 'headers'?: Record<string, string> }).headers, {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json'
      });
    });

    void it('should merge headers from multiple headers() calls', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .headers({ Authorization: 'Bearer token' })
        .headers({ 'Content-Type': 'application/json' })
        .get();

      assert.deepStrictEqual((capturedOptions as { 'headers'?: Record<string, string> }).headers, {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json'
      });
    });

    void it('should override headers with same key', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .header('Authorization', 'Bearer first')
        .header('Authorization', 'Bearer second')
        .get();

      assert.deepStrictEqual((capturedOptions as { 'headers'?: Record<string, string> }).headers, { Authorization: 'Bearer second' });
    });

    void it('should handle case-sensitive header names', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .header('content-type', 'application/json')
        .header('Content-Type', 'text/plain')
        .get();

      assert.deepStrictEqual((capturedOptions as { 'headers'?: Record<string, string> }).headers, {
        'content-type': 'application/json',
        'Content-Type': 'text/plain'
      });
    });

    void it('should mix header() and headers() calls', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .header('Authorization', 'Bearer token')
        .headers({
          Accept: 'application/json',
          'Content-Type': 'application/json'
        })
        .header('X-Custom', 'value')
        .get();

      assert.deepStrictEqual((capturedOptions as { 'headers'?: Record<string, string> }).headers, {
        Accept: 'application/json',
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
        'X-Custom': 'value'
      });
    });
  });

  void describe('timeout configuration', () => {
    void it('should set timeout', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.timeout(5000).get();

      assert.strictEqual((capturedOptions as { 'timeout'?: number }).timeout, 5000);
    });

    void it('should override timeout when set multiple times', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .timeout(5000)
        .timeout(10_000)
        .get();

      assert.strictEqual((capturedOptions as { 'timeout'?: number }).timeout, 10_000);
    });

    void it('should handle zero timeout', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.timeout(0).get();

      assert.strictEqual((capturedOptions as { 'timeout'?: number }).timeout, 0);
    });
  });

  void describe('method chaining', () => {
    void it('should support fluent API', async () => {
      let capturedPath: string | undefined;
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (path, options) => {
          capturedPath = path;
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .header('Authorization', 'Bearer token')
        .queryString('page', 1)
        .timeout(5000)
        .metadata({ operation: 'test' })
        .get();

      assert.strictEqual(capturedPath, '/test?page=1');
      assert.deepStrictEqual(
        (capturedOptions as { 'headers'?: Record<string, string> }).headers,
        { Authorization: 'Bearer token' }
      );
      assert.strictEqual((capturedOptions as { 'timeout'?: number }).timeout, 5000);
      assert.deepStrictEqual(
        (capturedOptions as { 'metadata'?: unknown }).metadata,
        { operation: 'test' }
      );
    });

    void it('should maintain builder state across chains', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test')
        .header('X-First', 'first')
        .timeout(5000);

      builder.header('X-Second', 'second');

      await builder.get();

      assert.deepStrictEqual((capturedOptions as { 'headers'?: Record<string, string> }).headers, {
        'X-First': 'first',
        'X-Second': 'second'
      });
    });

    void it('should allow order-independent chaining', async () => {
      let capturedPath: string | undefined;
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (path, options) => {
          capturedPath = path;
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .timeout(5000)
        .queryString('page', 1)
        .metadata({ operation: 'test' })
        .header('Authorization', 'Bearer token')
        .get();

      assert.strictEqual(capturedPath, '/test?page=1');
      assert.deepStrictEqual(
        (capturedOptions as { 'headers'?: Record<string, string> }).headers,
        { Authorization: 'Bearer token' }
      );
      assert.strictEqual((capturedOptions as { 'timeout'?: number }).timeout, 5000);
    });
  });

  void describe('HTTP methods', () => {
    void it('should execute GET request', async () => {
      let methodCalled = false;
      const client = createMockClient({
        get: async () => {
          methodCalled = true;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.get();
      assert.strictEqual(methodCalled, true);
    });

    void it('should execute POST request with body', async () => {
      let capturedBody: unknown;
      const client = createMockClient({
        post: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const data = { key: 'value' };

      await builder.body(data).post();
      assert.deepStrictEqual(capturedBody, data);
    });

    void it('should execute PUT request with body', async () => {
      let capturedBody: unknown;
      const client = createMockClient({
        put: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const data = { key: 'value' };

      await builder.body(data).put();
      assert.deepStrictEqual(capturedBody, data);
    });

    void it('should execute PATCH request with body', async () => {
      let capturedBody: unknown;
      const client = createMockClient({
        patch: async (_path, opts) => {
          capturedBody = opts?.body;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');
      const data = { key: 'value' };

      await builder.body(data).patch();
      assert.deepStrictEqual(capturedBody, data);
    });

    void it('should execute DELETE request', async () => {
      let methodCalled = false;
      const client = createMockClient({
        delete: async () => {
          methodCalled = true;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.delete();
      assert.strictEqual(methodCalled, true);
    });

    void it('should execute HEAD request', async () => {
      let methodCalled = false;
      const client = createMockClient({
        head: async () => {
          methodCalled = true;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.head();
      assert.strictEqual(methodCalled, true);
    });

    void it('should execute OPTIONS request', async () => {
      let methodCalled = false;
      const client = createMockClient({
        options: async () => {
          methodCalled = true;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.options();
      assert.strictEqual(methodCalled, true);
    });
  });

  void describe('request interceptors', () => {
    void it('should add single request interceptor', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.requestInterceptor(passthroughRequestInterceptor1).get();

      const opts = capturedOptions as { 'requestInterceptor'?: RequestInterceptorType[] };

      assert.strictEqual(Array.isArray(opts.requestInterceptor), true);

      if (opts.requestInterceptor !== undefined) {
        assert.strictEqual(opts.requestInterceptor.length, 1);
        assert.strictEqual(opts.requestInterceptor[0], passthroughRequestInterceptor1);
      }
    });

    void it('should add multiple request interceptors via array', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.requestInterceptor([
        passthroughRequestInterceptor1,
        passthroughRequestInterceptor2
      ]).get();

      const opts = capturedOptions as { 'requestInterceptor'?: RequestInterceptorType[] };

      assert.strictEqual(Array.isArray(opts.requestInterceptor), true);

      if (opts.requestInterceptor !== undefined) {
        assert.strictEqual(opts.requestInterceptor.length, 2);
        assert.strictEqual(opts.requestInterceptor[0], passthroughRequestInterceptor1);
        assert.strictEqual(opts.requestInterceptor[1], passthroughRequestInterceptor2);
      }
    });

    void it('should accumulate interceptors from multiple calls', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .requestInterceptor(passthroughRequestInterceptor1)
        .requestInterceptor(passthroughRequestInterceptor2)
        .get();

      const opts = capturedOptions as { 'requestInterceptor'?: RequestInterceptorType[] };

      assert.strictEqual(Array.isArray(opts.requestInterceptor), true);
      assert.strictEqual(opts.requestInterceptor?.length, 2);
    });
  });

  void describe('response interceptors', () => {
    void it('should add single response interceptor', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.responseInterceptor(passthroughResponseInterceptor1).get();

      const opts = capturedOptions as { 'responseInterceptor'?: ResponseInterceptorType[] };

      assert.strictEqual(Array.isArray(opts.responseInterceptor), true);

      if (opts.responseInterceptor !== undefined) {
        assert.strictEqual(opts.responseInterceptor.length, 1);
        assert.strictEqual(opts.responseInterceptor[0], passthroughResponseInterceptor1);
      }
    });

    void it('should add multiple response interceptors via array', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.responseInterceptor([
        passthroughResponseInterceptor1,
        passthroughResponseInterceptor2
      ]).get();

      const opts = capturedOptions as { 'responseInterceptor'?: ResponseInterceptorType[] };

      assert.strictEqual(Array.isArray(opts.responseInterceptor), true);

      if (opts.responseInterceptor !== undefined) {
        assert.strictEqual(opts.responseInterceptor.length, 2);
        assert.strictEqual(opts.responseInterceptor[0], passthroughResponseInterceptor1);
        assert.strictEqual(opts.responseInterceptor[1], passthroughResponseInterceptor2);
      }
    });

    void it('should accumulate interceptors from multiple calls', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder
        .responseInterceptor(passthroughResponseInterceptor1)
        .responseInterceptor(passthroughResponseInterceptor2)
        .get();

      const opts = capturedOptions as { 'responseInterceptor'?: ResponseInterceptorType[] };

      assert.strictEqual(Array.isArray(opts.responseInterceptor), true);
      assert.strictEqual(opts.responseInterceptor?.length, 2);
    });
  });

  void describe('builder state isolation', () => {
    void it('should not share state between builder instances', async () => {
      let capturedOptions1: unknown;
      let capturedOptions2: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          if (capturedOptions1 === undefined) {
            capturedOptions1 = options;
          } else {
            capturedOptions2 = options;
          }

          return new Response();
        }
      });

      const builder1 = new RequestBuilder(client, '/test1').timeout(1000);
      const builder2 = new RequestBuilder(client, '/test2').timeout(2000);

      await builder1.get();
      await builder2.get();

      const opts1 = capturedOptions1 as undefined | { 'timeout'?: number };
      const opts2 = capturedOptions2 as undefined | { 'timeout'?: number };

      if (opts1 === undefined || opts2 === undefined) {
        throw new Error('Options should be captured');
      }

      assert.strictEqual(opts1.timeout, 1000);
      assert.strictEqual(opts2.timeout, 2000);
    });

    void it('should not share headers between instances', async () => {
      let capturedOptions1: unknown;
      let capturedOptions2: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          if (capturedOptions1 === undefined) {
            capturedOptions1 = options;
          } else {
            capturedOptions2 = options;
          }

          return new Response();
        }
      });

      const builder1 = new RequestBuilder(client, '/test1').header('X-First', 'value1');
      const builder2 = new RequestBuilder(client, '/test2').header('X-Second', 'value2');

      await builder1.get();
      await builder2.get();

      const opts1 = capturedOptions1 as undefined | { 'headers'?: Record<string, string> };
      const opts2 = capturedOptions2 as undefined | { 'headers'?: Record<string, string> };

      if (opts1 === undefined || opts2 === undefined) {
        throw new Error('Options should be captured');
      }

      assert.deepStrictEqual(
        opts1.headers,
        { 'X-First': 'value1' }
      );
      assert.deepStrictEqual(
        opts2.headers,
        { 'X-Second': 'value2' }
      );
    });
  });

  void describe('edge cases', () => {
    void it('should handle empty path', async () => {
      let capturedPath: string | undefined;
      const client = createMockClient({
        get: async (path) => {
          capturedPath = path;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '');

      await builder.get();
      assert.strictEqual(capturedPath, '');
    });

    void it('should handle path with existing query parameters', async () => {
      let capturedPath: string | undefined;
      const client = createMockClient({
        get: async (path) => {
          capturedPath = path;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test?existing=value');

      await builder.queryString('new', 'param').get();
      assert.strictEqual(capturedPath, '/test?existing=value&new=param');
    });

    void it('should handle special characters in query values', async () => {
      let capturedPath: string | undefined;
      const client = createMockClient({
        get: async (path) => {
          capturedPath = path;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.queryString('search', 'hello world').get();
      assert.strictEqual(capturedPath, '/test?search=hello%20world');
    });

    void it('should handle empty headers object', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.headers({}).get();

      const headers = (capturedOptions as { 'headers'?: Record<string, string> }).headers;

      assert.deepStrictEqual(headers, {});
    });

    void it('should handle empty metadata object', async () => {
      let capturedOptions: unknown;
      const client = createMockClient({
        get: async (_path, options) => {
          capturedOptions = options;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/test');

      await builder.metadata({}).get();

      assert.deepStrictEqual((capturedOptions as { 'metadata'?: unknown }).metadata, {});
    });

    void it('should preserve path structure', async () => {
      let capturedPath: string | undefined;
      const client = createMockClient({
        get: async (path) => {
          capturedPath = path;

          return new Response();
        }
      });

      const builder = new RequestBuilder(client, '/api/v1/users/123');

      await builder.get();
      assert.strictEqual(capturedPath, '/api/v1/users/123');
    });
  });
});
