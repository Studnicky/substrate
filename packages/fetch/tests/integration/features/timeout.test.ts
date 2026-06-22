import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  FetchClient,
  HttpMethods,
  TimeoutError
} from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

const {
  fetch: fetchWithTimeout, get
} = HttpMethods;

void describe('Timeout Feature', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('fetchWithTimeout', () => {
    void it('should complete request without timeout', async () => {
      const response = await fetchWithTimeout(`${testUrl}/posts/1`);

      assert.strictEqual(response.status, 200);
    });

    void it('should timeout if request takes too long', async () => {
      await assert.rejects(
        async () => {
          await fetchWithTimeout(`${testUrl}/posts/1`, { timeout: 1 });
        },
        (error: unknown) => {
          assert.ok(error instanceof TimeoutError);
          if (error instanceof TimeoutError) {
            assert.strictEqual(error.name, 'TimeoutError');
            assert.ok(error.message.includes('timed out'));
          }

          return true;
        }
      );
    });

    void it('should provide timeout details in error', async () => {
      try {
        await fetchWithTimeout(`${testUrl}/posts/1`, { timeout: 1 });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        if (error instanceof TimeoutError) {
          assert.strictEqual(error.timeoutMs, 1);
          assert.ok(error.url.includes('127.0.0.1'));
        }
      }
    });

    void it('should clear timeout after successful request', async () => {
      const response = await fetchWithTimeout(`${testUrl}/posts/1`, { timeout: 5000 });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Convenience methods with timeout', () => {
    void it('should support timeout in GET', async () => {
      await assert.rejects(
        async () => {
          await get(`${testUrl}/delay`, { timeout: 100 });
        },
        TimeoutError
      );
    });

    void it('should work with fast requests', async () => {
      const response = await get(`${testUrl}/posts/1`, { timeout: 5000 });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('FetchClient default timeout', () => {
    void it('should apply default timeout', async () => {
      const client = FetchClient.create({ timeout: 5000 });
      const response = await client.get(`${testUrl}/posts/1`);

      assert.strictEqual(response.status, 200);
    });

    void it('should allow request to override default timeout', async () => {
      const client = FetchClient.create({ timeout: 100 });
      const response = await client.get(`${testUrl}/posts/1`, { timeout: 5000 });

      assert.strictEqual(response.status, 200);
    });
  });
});
