import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  type ClientConfigInterface,
  ConfigurationError,
  FetchClient,
  type RequestContextInterface
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

    void it('should use custom requestIdGenerator', async () => {
      const generatedIds: string[] = [];

      class TrackingClient extends FetchClient {
        static override create(config: Parameters<typeof FetchClient.create>[0] = {}): TrackingClient {
          return new this(config);
        }

        protected override onRequestStart(_method: string, _path: string, requestId: string, _url: string): void {
          generatedIds.push(requestId);
        }
      }

      const client = TrackingClient.create({
        baseURL: testUrl,
        requestIdGenerator: () => {
          return 'custom-test-id';
        }
      });

      await client.get('/posts/1');

      assert.strictEqual(generatedIds[0], 'custom-test-id');
    });

    void it('should merge default metadata with request metadata', async () => {
      const capturedMetadata: Record<string, unknown>[] = [];

      class MetadataClient extends FetchClient {
        static override create(config: Parameters<typeof FetchClient.create>[0] = {}): MetadataClient {
          return new this(config);
        }

        protected override async onRequest(
          context: RequestContextInterface
        ): Promise<RequestContextInterface> {
          capturedMetadata.push({ ...context.metadata.metadata });
          return context;
        }
      }

      const client = MetadataClient.create({
        baseURL: testUrl,
        metadata: { service: 'test-service' }
      });

      await client.get('/posts/1', { metadata: { operation: 'get-post' } });

      assert.ok(capturedMetadata[0] !== undefined);
      assert.strictEqual(capturedMetadata[0].service, 'test-service');
      assert.strictEqual(capturedMetadata[0].operation, 'get-post');
    });

    void it('should detach construction config from caller-owned mutable data', async () => {
      let capturedContext: RequestContextInterface | undefined;

      class SnapshotClient extends FetchClient {
        static override create(config: ClientConfigInterface = {}): SnapshotClient {
          return new this(config);
        }

        protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
          capturedContext = context;
          return context;
        }
      }

      const clientHeaders = { 'X-Client': 'initial-client' };
      const optionHeaders = { 'X-Option': 'initial-option' };
      const metadataDetails = { version: 1 };
      const optionMetadataDetails = { enabled: true };
      const optionJson = { nested: { value: 'initial-json' } };
      const tags = ['one', 'two'];
      const config: ClientConfigInterface = {
        baseURL: testUrl,
        headers: clientHeaders,
        metadata: { details: metadataDetails },
        options: {
          headers: optionHeaders,
          json: optionJson,
          metadata: { details: optionMetadataDetails }
        },
        params: { tag: tags }
      };
      const client = SnapshotClient.create(config);

      config.baseURL = 'http://127.0.0.1:1';
      config.headers = { 'X-Client': 'replacement-client' };
      config.metadata = { details: { version: 3 } };
      config.options = { headers: { 'X-Option': 'replacement-option' } };
      config.params = { tag: ['replacement'] };
      clientHeaders['X-Client'] = 'mutated-client';
      optionHeaders['X-Option'] = 'mutated-option';
      metadataDetails.version = 2;
      optionMetadataDetails.enabled = false;
      optionJson.nested.value = 'mutated-json';
      tags.push('three');

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
      assert.ok(capturedContext !== undefined);
      assert.strictEqual(capturedContext.url, `${testUrl}/posts/1?tag=one&tag=two`);
      assert.deepStrictEqual(capturedContext.metadata.metadata, { details: { version: 1 } });
      assert.deepStrictEqual(capturedContext.options.headers, {
        'X-Client': 'initial-client',
        'X-Option': 'initial-option'
      });
      assert.deepStrictEqual(capturedContext.options.metadata, { details: { enabled: true } });
      assert.deepStrictEqual(capturedContext.options.json, { nested: { value: 'initial-json' } });
    });
  });
});
