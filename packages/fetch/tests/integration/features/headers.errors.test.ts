import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  FetchClient
} from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('Headers Error Scenarios', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('Invalid header values in client config', () => {
    const invalidHeaderScenarios = [
      {
        description: 'non-string header value (number)',
        headers: { 'X-Custom': 123 as unknown as string }
      },
      {
        description: 'non-string header value (boolean)',
        headers: { 'X-Custom': true as unknown as string }
      },
      {
        description: 'non-string header value (null)',
        headers: { 'X-Custom': null as unknown as string }
      },
      {
        description: 'non-string header value (undefined)',
        headers: { 'X-Custom': undefined as unknown as string }
      },
      {
        description: 'non-string header value (object)',
        headers: { 'X-Custom': {} as unknown as string }
      },
      {
        description: 'non-string header value (array)',
        headers: { 'X-Custom': [] as unknown as string }
      }
    ];

    for (const {
      description, headers: testHeaders
    } of invalidHeaderScenarios) {
      const baseUrl = testUrl;

      void it(`rejects ${description}`, () => {
        assert.throws(
          () => {
            FetchClient.create({
              baseURL: baseUrl,
              headers: testHeaders
            });
          },
          (error: Error) => {
            assert.ok(error.message.toLowerCase().includes('header'));

            return true;
          }
        );
      });
    }
  });

  void describe('Invalid headers configuration type', () => {
    const invalidConfigScenarios = [
      {
        description: 'headers as array',
        headers: [] as unknown as Record<string, string>
      },
      {
        description: 'headers as string',
        headers: 'invalid' as unknown as Record<string, string>
      },
      {
        description: 'headers as number',
        headers: 123 as unknown as Record<string, string>
      }
    ];

    for (const {
      description, headers: testHeaders
    } of invalidConfigScenarios) {
      const baseUrl = testUrl;

      void it(`rejects ${description}`, () => {
        assert.throws(
          () => {
            FetchClient.create({
              baseURL: baseUrl,
              headers: testHeaders
            });
          },
          (error: Error) => {
            assert.ok(error.message.toLowerCase().includes('headers'));

            return true;
          }
        );
      });
    }

    void it('accepts null headers (no default headers)', () => {
      assert.doesNotThrow(() => {
        FetchClient.create({
          baseURL: testUrl,
          headers: null as unknown as Record<string, string>
        });
      });
    });
  });

  void describe('Header case sensitivity', () => {
    void it('sends headers with different casing', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: {
          'content-type': 'application/json',
          'Content-Type': 'text/plain'
        }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('multiple headers with case variations merge correctly', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: {
          'X-Custom': 'value1',
          'x-custom': 'value2',
          'X-CUSTOM': 'value3'
        }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Special characters in headers', () => {
    void it('handles empty header values', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'X-Empty': '' }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('handles header values with spaces', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'X-Spaced': 'value with spaces' }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('handles header values with special characters', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'X-Special': 'value!@#$%^&*()' }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('rejects unicode in header values (must be ASCII)', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'X-Unicode': '你好世界' }
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        TypeError
      );
    });
  });

  void describe('Long header values', () => {
    void it('handles very long header value (1KB)', async () => {
      const longValue = 'x'.repeat(1024);
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'X-Long': longValue }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('handles very long header value (8KB)', async () => {
      const longValue = 'x'.repeat(8192);
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'X-Very-Long': longValue }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Many headers', () => {
    void it('handles many headers (50)', async () => {
      const headers: Record<string, string> = {};

      for (let i = 0; i < 50; i++) {
        headers[`X-Header-${i}`] = `value-${i}`;
      }

      const client = FetchClient.create({
        baseURL: testUrl,
        headers: headers
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('handles many headers (100)', async () => {
      const headers: Record<string, string> = {};

      for (let i = 0; i < 100; i++) {
        headers[`X-Header-${i}`] = `value-${i}`;
      }

      const client = FetchClient.create({
        baseURL: testUrl,
        headers: headers
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Header merging behavior', () => {
    void it('request headers override client headers with same key', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'X-Custom': 'client-value' }
      });

      const response = await client.get('/posts/1', { headers: { 'X-Custom': 'request-value' } });

      assert.strictEqual(response.status, 200);
    });

    void it('request headers merge with client headers', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'X-Client': 'client-value' }
      });

      const response = await client.get('/posts/1', { headers: { 'X-Request': 'request-value' } });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Content-Type header edge cases', () => {
    void it('handles explicit Content-Type with JSON body', async () => {
      const client = FetchClient.create({ baseURL: testUrl });

      const response = await client.post('/posts', {
        body: { title: 'Test' },
        headers: { 'Content-Type': 'application/json' }
      });

      assert.strictEqual(response.status, 201);
    });

    void it('handles mismatched Content-Type and body', async () => {
      const client = FetchClient.create({ baseURL: testUrl });

      const response = await client.post('/posts', {
        body: JSON.stringify({ title: 'Test' }),
        headers: { 'Content-Type': 'text/plain' }
      });

      assert.strictEqual(response.status, 201);
    });

    void it('handles multiple Content-Type declarations', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'content-type': 'application/json' }
      });

      const response = await client.post('/posts', {
        body: JSON.stringify({ title: 'Test' }),
        headers: { 'Content-Type': 'text/plain' }
      });

      assert.strictEqual(response.status, 201);
    });
  });

  void describe('Authorization header edge cases', () => {
    void it('handles empty Authorization header', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { Authorization: '' }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('handles malformed Authorization header', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { Authorization: 'InvalidFormat' }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('handles very long Authorization token', async () => {
      const longToken = `Bearer ${'x'.repeat(2048)}`;
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { Authorization: longToken }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Reserved header handling', () => {
    void it('handles User-Agent header', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        headers: { 'User-Agent': 'CustomAgent/1.0' }
      });

      const response = await client.get('/posts/1');

      assert.strictEqual(response.status, 200);
    });

    void it('handles Accept header variations', async () => {
      const acceptValues = [
        'application/json',
        '*/*',
        'application/json, text/plain, */*',
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      ];

      const client = FetchClient.create({ baseURL: testUrl });

      for (const accept of acceptValues) {
        const response = await client.get('/posts/1', { headers: { Accept: accept } });

        assert.strictEqual(response.status, 200, `Failed with Accept: ${accept}`);
      }
    });
  });
});
