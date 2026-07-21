import type { Server } from 'node:http';

import assert from 'node:assert';
import { createServer } from 'node:http';
import {
  after, before, describe, it
} from 'node:test';

import {
  AbortError, FetchClient, TimeoutError
} from '../../../src/index.js';

const client = FetchClient.create();

let server: Server;
let serverUrl: string;

void before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    switch (url.pathname) {
      case '/delay': {
        const delayMs = Number.parseInt(url.searchParams.get('ms') ?? '100', 10);

        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end(`delayed ${delayMs}ms`);
        }, delayMs);
        break;
      }

      case '/error':
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('server error');
        break;


      case '/instant':
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('instant response');
        break;


      default:
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('not found');
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const address = server.address();

      if (address !== null && typeof address === 'object') {
        serverUrl = `http://localhost:${address.port}`;
        resolve();
      }
    });
  });
});

void after(() => {
  server.close();
});

void describe('fetch wrapper', () => {
  void describe('URL validation', () => {
    void it('should reject empty string URL', async () => {
      await assert.rejects(
        async () => {
          return client.get('');
        },
        /url must be a non-empty string/u
      );
    });

    void it('should reject non-string URL', async () => {
      await assert.rejects(
        async () => {
          return Reflect.apply(client.get, client, [123]);
        },
        /url must be a non-empty string/u
      );
    });

    void it('should reject null URL', async () => {
      await assert.rejects(
        async () => {
          return Reflect.apply(client.get, client, [null]);
        },
        /url must be a non-empty string/u
      );
    });

    void it('should reject undefined URL', async () => {
      await assert.rejects(
        async () => {
          return Reflect.apply(client.get, client, []);
        },
        /url must be a non-empty string/u
      );
    });

    void it('should accept valid URL strings', async () => {
      const response = await client.get(`${serverUrl}/instant`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(await response.text(), 'instant response');
    });
  });

  void describe('Timeout validation', () => {
    const invalidTimeouts = [
      {
        description: 'zero',
        value: 0
      },
      {
        description: 'negative',
        value: -1
      },
      {
        description: 'NaN',
        value: Number.NaN
      },
      {
        description: 'Infinity',
        value: Infinity
      },
      {
        description: '-Infinity',
        value: -Infinity
      }
    ];

    for (const {
      description, value
    } of invalidTimeouts) {
      const testUrl = serverUrl;

      void it(`should reject ${description} timeout`, async () => {
        await assert.rejects(
          async () => {
            return client.get(`${testUrl}/instant`, { timeout: value });
          },
          /timeout must be a positive number/u
        );
      });
    }

    void it('should reject non-number timeout', async () => {
      await assert.rejects(
        async () => {
          return Reflect.apply(client.get, client, [`${serverUrl}/instant`, { timeout: '5000' }]);
        },
        /timeout must be a positive number/u
      );
    });

    void it('should accept valid positive timeout', async () => {
      const response = await client.get(`${serverUrl}/instant`, { timeout: 5000 });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Timeout functionality', () => {
    void it('should timeout request that exceeds timeout', async () => {
      try {
        await client.get(`${serverUrl}/delay?ms=200`, { timeout: 50 });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        if (error instanceof TimeoutError) {
          assert.strictEqual(error.name, 'TimeoutError');
          assert.ok(error.message.includes('timed out'));
          assert.ok(error.message.includes('50ms'));
          assert.strictEqual(error.timeoutMs, 50);
          assert.ok(error.url.includes('/delay'));
        }
      }
    });

    void it('should complete request within timeout', async () => {
      const response = await client.get(`${serverUrl}/delay?ms=50`, { timeout: 200 });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(await response.text(), 'delayed 50ms');
    });

    void it('should handle very short timeout (1ms)', async () => {
      try {
        await client.get(`${serverUrl}/delay?ms=100`, { timeout: 1 });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        if (error instanceof TimeoutError) {
          assert.strictEqual(error.timeoutMs, 1);
        }
      }
    });

    void it('should handle very long timeout', async () => {
      const response = await client.get(`${serverUrl}/instant`, { timeout: 3_600_000 });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Signal handling', () => {
    void it('should respect external signal abort', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 10);

      try {
        await client.get(`${serverUrl}/delay?ms=200`, { signal: controller.signal });
        assert.fail('Should have thrown AbortError');
      } catch (error) {
        assert.ok(error instanceof AbortError);
        if (error instanceof AbortError) {
          assert.strictEqual(error.name, 'AbortError');
          assert.ok(error.message.includes('aborted'));
          assert.ok(error.url.includes('/delay'));
        }
      }
    });

    void it('should handle already-aborted signal', async () => {
      const controller = new AbortController();

      controller.abort();

      try {
        await client.get(`${serverUrl}/instant`, { signal: controller.signal });
        assert.fail('Should have thrown AbortError');
      } catch (error) {
        assert.ok(error instanceof AbortError);
        if (error instanceof AbortError) {
          assert.strictEqual(error.name, 'AbortError');
          assert.ok(error.message.includes('aborted'));
        }
      }
    });

    void it('should combine timeout signal and external signal', async () => {
      const controller = new AbortController();
      const response = await client.get(`${serverUrl}/instant`, {
        signal: controller.signal,
        timeout: 5000
      });

      assert.strictEqual(response.status, 200);
    });

    void it('should timeout even with external signal present', async () => {
      const controller = new AbortController();

      try {
        await client.get(`${serverUrl}/delay?ms=200`, {
          signal: controller.signal,
          timeout: 50
        });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        if (error instanceof TimeoutError) {
          assert.strictEqual(error.name, 'TimeoutError');
          assert.strictEqual(error.timeoutMs, 50);
        }
      }
    });

    void it('should distinguish external abort from timeout when both signals present', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 10);

      try {
        await client.get(`${serverUrl}/delay?ms=200`, {
          signal: controller.signal,
          timeout: 5000
        });
        assert.fail('Should have thrown AbortError');
      } catch (error) {
        assert.ok(error instanceof AbortError);
        if (error instanceof AbortError) {
          assert.strictEqual(error.name, 'AbortError');
          assert.ok(error.message.includes('aborted'));
        }
      }
    });
  });

  void describe('Request without timeout', () => {
    void it('should make successful request without timeout option', async () => {
      const response = await client.get(`${serverUrl}/instant`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(await response.text(), 'instant response');
    });

    void it('should handle request with external signal but no timeout', async () => {
      const controller = new AbortController();
      const response = await client.get(`${serverUrl}/instant`, { signal: controller.signal });

      assert.strictEqual(response.status, 200);
    });

    void it('should propagate server errors without timeout', async () => {
      const response = await client.get(`${serverUrl}/error`);

      assert.strictEqual(response.status, 500);
      assert.strictEqual(await response.text(), 'server error');
    });
  });

  void describe('Error handling', () => {
    void it('should handle network errors', async () => {
      await assert.rejects(
        async () => {
          return client.get('http://localhost:1');
        },
        /ECONNREFUSED|fetch failed/u
      );
    });

    void it('should handle DNS resolution errors', async () => {
      await assert.rejects(
        async () => {
          return client.get('http://this-domain-definitely-does-not-exist-12345.com');
        },
        /EAI_AGAIN|ENOTFOUND|fetch failed/u
      );
    });

    void it('should handle invalid URL format', async () => {
      await assert.rejects(
        async () => {
          return client.get('not-a-valid-url');
        },
        Error
      );
    });
  });

  void describe('Edge cases', () => {
    void it('should handle multiple requests with different timeouts', async () => {
      const [
        response1,
        response2
      ] = await Promise.all([
        client.get(`${serverUrl}/instant`, { timeout: 1000 }),
        client.get(`${serverUrl}/instant`, { timeout: 2000 })
      ]);

      assert.strictEqual(response1.status, 200);
      assert.strictEqual(response2.status, 200);
    });

    void it('should handle request that completes just before timeout', async () => {
      const response = await client.get(`${serverUrl}/delay?ms=40`, { timeout: 100 });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(await response.text(), 'delayed 40ms');
    });

    void it('should handle empty options object', async () => {
      const response = await client.get(`${serverUrl}/instant`, {});

      assert.strictEqual(response.status, 200);
    });

    void it('should handle request with additional fetch options', async () => {
      const response = await client.get(`${serverUrl}/instant`, {
        headers: { 'X-Custom': 'test' },
        method: 'GET',
        timeout: 5000
      });

      assert.strictEqual(response.status, 200);
    });

    void it('should pass through other fetch options without timeout', async () => {
      const response = await client.get(`${serverUrl}/instant`, {
        headers: { 'X-Test': 'value' },
        method: 'GET'
      });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Signal cleanup', () => {
    void it('should cleanup timeout on successful request', async () => {
      const response = await client.get(`${serverUrl}/instant`, { timeout: 5000 });

      assert.strictEqual(response.status, 200);
    });

    void it('should cleanup timeout on failed request', async () => {
      const controller = new AbortController();

      controller.abort();

      try {
        await client.get(`${serverUrl}/instant`, {
          signal: controller.signal,
          timeout: 5000
        });
        assert.fail('Should have thrown AbortError');
      } catch (error) {
        assert.ok(error instanceof AbortError);
      }
    });
  });

  void describe('fetchWithoutTimeout path', () => {
    void it('should use direct fetch when timeout is undefined', async () => {
      const response = await client.get(`${serverUrl}/instant`);

      assert.strictEqual(response.status, 200);
    });

    void it('should pass external signal to fetch when no timeout', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 10);

      try {
        await client.get(`${serverUrl}/delay?ms=200`, { signal: controller.signal });
        assert.fail('Should have thrown AbortError');
      } catch (error) {
        assert.ok(error instanceof AbortError);
      }
    });

    void it('should convert abort error to AbortError', async () => {
      const controller = new AbortController();

      controller.abort();

      try {
        await client.get(`${serverUrl}/instant`, { signal: controller.signal });
        assert.fail('Should have thrown AbortError');
      } catch (error) {
        assert.ok(error instanceof AbortError);
        if (error instanceof AbortError) {
          assert.ok(error.message.includes('aborted'));
        }
      }
    });
  });

  void describe('timeout path', () => {
    void it('should apply a timeout when specified', async () => {
      const response = await client.get(`${serverUrl}/instant`, { timeout: 5000 });

      assert.strictEqual(response.status, 200);
    });

    void it('should throw TimeoutError when timeout expires', async () => {
      try {
        await client.get(`${serverUrl}/delay?ms=200`, { timeout: 50 });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        if (error instanceof TimeoutError) {
          assert.strictEqual(error.name, 'TimeoutError');
          assert.strictEqual(error.timeoutMs, 50);
        }
      }
    });

    void it('should throw AbortError when external signal aborts', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 10);

      try {
        await client.get(`${serverUrl}/delay?ms=200`, {
          signal: controller.signal,
          timeout: 5000
        });
        assert.fail('Should have thrown AbortError');
      } catch (error) {
        assert.ok(error instanceof AbortError);
        if (error instanceof AbortError) {
          assert.strictEqual(error.name, 'AbortError');
          assert.ok(error.message.includes('aborted'));
        }
      }
    });

    void it('should prioritize timeout error over external abort if timeout fires first', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 100);

      try {
        await client.get(`${serverUrl}/delay?ms=200`, {
          signal: controller.signal,
          timeout: 20
        });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        if (error instanceof TimeoutError) {
          assert.strictEqual(error.name, 'TimeoutError');
        }
      }
    });
  });
});
