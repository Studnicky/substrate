import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  AbortError,
  HttpMethods,
  TimeoutError
} from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

const {
  fetch: fetchWithTimeout, get
} = HttpMethods;

void describe('Abort Controller Feature', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('Manual abort', () => {
    void it('should provide abort details in error', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 10);

      try {
        await fetchWithTimeout(`${testUrl}/delay`, { signal: controller.signal });
        assert.fail('Should have thrown AbortError');
      } catch (error) {
        assert.ok(error instanceof AbortError);
        if (error instanceof AbortError) {
          assert.ok(error.url.includes('127.0.0.1'));
        }
      }
    });
  });

  void describe('Combined timeout and abort', () => {
    void it('should throw TimeoutError when timeout occurs first', async () => {
      const controller = new AbortController();

      await assert.rejects(
        async () => {
          await fetchWithTimeout(`${testUrl}/delay`, {
            signal: controller.signal,
            timeout: 100
          });
        },
        TimeoutError
      );
    });

    void it('should throw AbortError when manual abort occurs first', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 50);

      await assert.rejects(
        async () => {
          await fetchWithTimeout(`${testUrl}/delay`, {
            signal: controller.signal,
            timeout: 5000
          });
        },
        AbortError
      );
    });
  });

  void describe('Convenience methods with abort', () => {
    void it('should support abort in GET', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 50);

      await assert.rejects(
        async () => {
          await get(`${testUrl}/delay`, { signal: controller.signal });
        },
        AbortError
      );
    });
  });
});
