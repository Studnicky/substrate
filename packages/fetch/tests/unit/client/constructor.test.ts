import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  ConfigurationError, FetchClient
} from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('FetchClient Constructor', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('Valid Configurations', () => {
    void it('should create client with no config', () => {
      const client = FetchClient.create();

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with baseURL', () => {
      const client = FetchClient.create({ baseURL: 'https://api.example.com' });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with default headers', () => {
      const client = FetchClient.create({ headers: { Authorization: 'Bearer token' } });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with timeout', () => {
      const client = FetchClient.create({ timeout: 5000 });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with dispatcher', () => {
      const client = FetchClient.create({
        dispatcher: {
          connections: 10,
          enabled: true
        }
      });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with single request interceptor', () => {
      const client = FetchClient.create({
        requestInterceptor: async ({
          metadata, options, url
        }) => {
          return {
            metadata,
            options,
            url
          };
        }
      });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with array of request interceptors', () => {
      const client = FetchClient.create({
        requestInterceptor: [
          async ({
            metadata, options, url
          }) => {
            return {
              metadata,
              options,
              url
            };
          },
          async ({
            metadata, options, url
          }) => {
            return {
              metadata,
              options,
              url
            };
          }
        ]
      });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with single response interceptor', () => {
      const client = FetchClient.create({
        responseInterceptor: async ({
          request, response
        }) => {
          return {
            request,
            response
          };
        }
      });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with array of response interceptors', () => {
      const client = FetchClient.create({
        responseInterceptor: [
          async ({
            request, response
          }) => {
            return {
              request,
              response
            };
          },
          async ({
            request, response
          }) => {
            return {
              request,
              response
            };
          }
        ]
      });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with custom requestIdGenerator', () => {
      const client = FetchClient.create({
        requestIdGenerator: () => {
          return 'custom-id';
        }
      });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with metadata', () => {
      const client = FetchClient.create({
        metadata: {
          service: 'test-service',
          version: '1.0.0'
        }
      });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with default params', () => {
      const client = FetchClient.create({ params: { api_key: 'test-key' } });

      assert.ok(client instanceof FetchClient);
    });

    void it('should create client with fetch options', () => {
      const client = FetchClient.create({ options: { credentials: 'include' } });

      assert.ok(client instanceof FetchClient);
    });
  });

  void describe('Invalid Configurations', () => {
    void it('should reject invalid baseURL', () => {
      assert.throws(
        () => {
          FetchClient.create({ baseURL: 'not-a-valid-url' });
        },
        (error: Error) => {
          assert.ok(error instanceof ConfigurationError);
          assert.ok(error.message.includes('baseURL'));

          return true;
        }
      );
    });

    void it('should reject negative timeout', () => {
      assert.throws(
        () => {
          FetchClient.create({ timeout: -1000 });
        },
        (error: Error) => {
          assert.ok(error instanceof ConfigurationError);
          assert.ok(error.message.includes('timeout'));

          return true;
        }
      );
    });

    void it('should reject non-numeric timeout', () => {
      assert.throws(
        () => {
          FetchClient.create({ timeout: 'not-a-number' as unknown as number });
        },
        (error: Error) => {
          assert.ok(error instanceof ConfigurationError);
          assert.ok(error.message.includes('timeout'));

          return true;
        }
      );
    });

    void it('should reject invalid headers object', () => {
      assert.throws(
        () => {
          FetchClient.create({ headers: 'not-an-object' as unknown as Record<string, string> });
        },
        (error: Error) => {
          assert.ok(error instanceof ConfigurationError);
          assert.ok(error.message.includes('headers'));

          return true;
        }
      );
    });

    void it('should reject unknown configuration keys', () => {
      assert.throws(
        () => {
          FetchClient.create({ unknownKey: 'value' } as unknown as Parameters<typeof FetchClient.create>[0]);
        },
        (error: Error) => {
          assert.ok(error instanceof ConfigurationError);

          return true;
        }
      );
    });

    void it('should reject invalid requestInterceptor', () => {
      assert.throws(
        () => {
          // @ts-expect-error - Testing invalid input
          FetchClient.create({ requestInterceptor: 'not-a-function' });
        },
        (error: unknown): error is Error => {
          if (error instanceof Error) {
            assert.ok(error instanceof ConfigurationError);
            assert.ok(error.message.includes('requestInterceptor'));

            return true;
          }

          return false;
        }
      );
    });

    void it('should reject invalid responseInterceptor', () => {
      assert.throws(
        () => {
          // @ts-expect-error - Testing invalid input
          FetchClient.create({ responseInterceptor: 123 });
        },
        (error: unknown): error is Error => {
          if (error instanceof Error) {
            assert.ok(error instanceof ConfigurationError);
            assert.ok(error.message.includes('responseInterceptor'));

            return true;
          }

          return false;
        }
      );
    });

    void it('should reject invalid requestIdGenerator', () => {
      assert.throws(
        () => {
          FetchClient.create({ requestIdGenerator: 'not-a-function' as unknown as () => string });
        },
        (error: Error) => {
          assert.ok(error instanceof ConfigurationError);
          assert.ok(error.message.includes('requestIdGenerator'));

          return true;
        }
      );
    });
  });

  void describe('Behavior Verification', () => {
    void it('should apply baseURL to requests', async () => {
      const client = FetchClient.create({ baseURL: testUrl });
      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
      const data = await response.json() as { id: number;
        title: string };

      assert.strictEqual(data.id, 1);
      assert.strictEqual(data.title, 'Test Post');
    });

    void it('should apply default headers to requests', async () => {
      let capturedHeaders: globalThis.Headers | undefined;
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'X-Custom-Header': 'test-value' },
        requestInterceptor: async ({
          metadata, options, url
        }) => {
          capturedHeaders = new globalThis.Headers(options.headers);

          return {
            metadata,
            options,
            url
          };
        }
      });

      await client.get('/posts/1');

      if (capturedHeaders !== undefined) {
        assert.strictEqual(capturedHeaders.get('X-Custom-Header'), 'test-value');
      }
    });

    void it('should apply default timeout to requests', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        timeout: 100
      });

      await assert.rejects(
        async () => {
          await client.get('/delay');
        },
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.ok(error.name === 'TimeoutError');

          return true;
        }
      );
    });

    void it('should execute configured request interceptor', async () => {
      let interceptorCalled = false;
      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: async ({
          metadata, options, url
        }) => {
          interceptorCalled = true;

          return {
            metadata,
            options,
            url
          };
        }
      });

      await client.get('/posts/1');

      assert.strictEqual(interceptorCalled, true);
    });

    void it('should execute configured response interceptor', async () => {
      let interceptorCalled = false;
      const client = FetchClient.create({
        baseURL: testUrl,
        responseInterceptor: async ({
          request, response
        }) => {
          interceptorCalled = true;

          return {
            request,
            response
          };
        }
      });

      await client.get('/posts/1');

      assert.strictEqual(interceptorCalled, true);
    });

    void it('should use custom requestIdGenerator', async () => {
      let generatedId: string | undefined;
      const client = FetchClient.create({
        baseURL: testUrl,
        requestIdGenerator: () => {
          return 'custom-test-id';
        },
        requestInterceptor: async ({
          metadata, options, url
        }) => {
          generatedId = metadata.requestId;

          return {
            metadata,
            options,
            url
          };
        }
      });

      await client.get('/posts/1');

      assert.strictEqual(generatedId, 'custom-test-id');
    });

    void it('should execute array of request interceptors in order', async () => {
      const order: number[] = [];
      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: [
          async ({
            metadata, options, url
          }) => {
            order.push(1);

            return {
              metadata,
              options,
              url
            };
          },
          async ({
            metadata, options, url
          }) => {
            order.push(2);

            return {
              metadata,
              options,
              url
            };
          }
        ]
      });

      await client.get('/posts/1');

      assert.deepStrictEqual(order, [
        1,
        2
      ]);
    });

    void it('should execute array of response interceptors in order', async () => {
      const order: number[] = [];
      const client = FetchClient.create({
        baseURL: testUrl,
        responseInterceptor: [
          async ({
            request, response
          }) => {
            order.push(1);

            return {
              request,
              response
            };
          },
          async ({
            request, response
          }) => {
            order.push(2);

            return {
              request,
              response
            };
          }
        ]
      });

      await client.get('/posts/1');

      assert.deepStrictEqual(order, [
        1,
        2
      ]);
    });

    void it('should merge default metadata with request metadata', async () => {
      let capturedMetadata: Record<string, unknown> | undefined;
      const client = FetchClient.create({
        baseURL: testUrl,
        metadata: { service: 'test-service' },
        requestInterceptor: async ({
          metadata, options, url
        }) => {
          capturedMetadata = metadata.metadata;

          return {
            metadata,
            options,
            url
          };
        }
      });

      await client.get('/posts/1', { metadata: { operation: 'get-post' } });

      assert.ok(capturedMetadata);
      assert.strictEqual(capturedMetadata.service, 'test-service');
      assert.strictEqual(capturedMetadata.operation, 'get-post');
    });
  });
});
