import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  AbortError,
  FetchClient,
  TimeoutError
} from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

const client = FetchClient.create();

void describe('Error Handling', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('TimeoutError', () => {
    void it('should have correct properties', async () => {
      try {
        await client.get(`${testUrl}/posts/1`, { timeout: 1 });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        assert.strictEqual(error.name, 'TimeoutError');
        assert.strictEqual(error.timeoutMs, 1);
        assert.ok(error.url.includes('127.0.0.1'));
        assert.ok(error.message.includes('timed out'));
        assert.ok(error.message.includes('1ms'));
      }
    });

    void it('should be instance of Error', async () => {
      try {
        await client.get(`${testUrl}/posts/1`, { timeout: 1 });
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error instanceof TimeoutError);
      }
    });
  });

  void describe('AbortError', () => {
    void it('should have correct properties', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 10);

      try {
        await client.get(`${testUrl}/delay`, { signal: controller.signal });
        assert.fail('Should have thrown AbortError');
      } catch (error) {
        assert.ok(error instanceof AbortError);
        assert.strictEqual(error.name, 'AbortError');
        assert.ok(error.url.includes('127.0.0.1'));
        assert.ok(error.message.includes('aborted'));
      }
    });

    void it('should be instance of Error', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 10);

      try {
        await client.get(`${testUrl}/delay`, { signal: controller.signal });
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok(error instanceof Error);
        assert.ok(error instanceof AbortError);
      }
    });
  });

  void describe('Network errors', () => {
    void it('should propagate network errors', async () => {
      await assert.rejects(
        async () => {
          await client.get('https://invalid-domain-that-does-not-exist-12345.com');
        },
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.ok(!(error instanceof TimeoutError));
          assert.ok(!(error instanceof AbortError));

          return true;
        }
      );
    });
  });

  void describe('HTTP status errors', () => {
    void it('should return 404 response without throwing', async () => {
      const response = await client.get(`${testUrl}/posts/999999`);

      assert.strictEqual(response.status, 404);
      assert.strictEqual(response.ok, false);
    });
  });
});
