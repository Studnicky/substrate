import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import {
  FetchClient,
  TimeoutError
} from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

const client = FetchClient.create();

void describe('Timeout Error Scenarios', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('Edge case timeout values', () => {
    void it('handles very small timeout (1ms)', async () => {
      await assert.rejects(
        async () => {
          await client.get(`${testUrl}/posts/1`, { timeout: 1 });
        },
        (error: unknown) => {
          assert.ok(error instanceof TimeoutError, 'Should throw TimeoutError');
          if (error instanceof TimeoutError) {
            assert.strictEqual(error.timeoutMs, 1);
          }

          return true;
        }
      );
    });

    void it('handles moderate timeout (1000ms)', async () => {
      const response = await client.get(`${testUrl}/posts/1`, { timeout: 1000 });

      assert.strictEqual(response.status, 200);
    });

    void it('handles large timeout (60000ms)', async () => {
      const response = await client.get(`${testUrl}/posts/1`, { timeout: 60_000 });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Invalid timeout values', () => {
    const invalidScenarios = [
      {
        description: 'negative timeout',
        expectedError: 'timeout must be positive',
        timeout: -1
      },
      {
        description: 'Infinity timeout',
        expectedError: 'timeout must be finite',
        timeout: Infinity
      },
      {
        description: 'string timeout',
        expectedError: 'timeout must be a number',
        timeout: '1000' as unknown as number
      },
      {
        description: 'object timeout',
        expectedError: 'timeout must be a number',
        timeout: {} as unknown as number
      }
    ];

    for (const scenario of invalidScenarios) {
      void it(`rejects ${scenario.description}`, () => {
        assert.throws(
          () => {
            FetchClient.create({ timeout: scenario.timeout });
          },
          (error: unknown) => {
            assert.ok(error instanceof Error);
            assert.ok(error.message.toLowerCase().includes(scenario.expectedError.toLowerCase()));

            return true;
          }
        );
      });
    }
  });

  void describe('Accepted edge case timeout values', () => {
    void it('accepts null timeout (no timeout)', () => {
      assert.doesNotThrow(() => {
        FetchClient.create({ timeout: null as unknown as number });
      });
    });

    void it('accepts undefined timeout (no timeout)', () => {
      assert.doesNotThrow(() => {
        FetchClient.create({ timeout: undefined });
      });
    });

    void it('accepts NaN timeout (treated as finite check failure)', () => {
      assert.throws(
        () => {
          FetchClient.create({ timeout: Number.NaN });
        },
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.toLowerCase().includes('finite'));

          return true;
        }
      );
    });

    void it('rejects zero timeout (must be positive)', () => {
      assert.throws(
        () => {
          FetchClient.create({
            baseURL: testUrl,
            timeout: 0
          });
        },
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.toLowerCase().includes('positive'));

          return true;
        }
      );
    });
  });

  void describe('Timeout timing behavior', () => {
    void it('timeout fires during slow request', async () => {
      const start = Date.now();

      await assert.rejects(
        async () => {
          await client.get(`${testUrl}/delay`, { timeout: 100 });
        },
        TimeoutError
      );

      const elapsed = Date.now() - start;

      assert.ok(elapsed < 200, `Should timeout around 100ms, took ${elapsed}ms`);
    });

    void it('timeout does not fire for fast requests', async () => {
      const start = Date.now();
      const response = await client.get(`${testUrl}/posts/1`, { timeout: 5000 });

      assert.strictEqual(response.status, 200);

      const elapsed = Date.now() - start;

      assert.ok(elapsed < 1000, `Fast request should complete quickly, took ${elapsed}ms`);
    });

    void it('subsequent requests after timeout work correctly', async () => {
      await assert.rejects(
        async () => {
          await client.get(`${testUrl}/delay`, { timeout: 50 });
        },
        TimeoutError
      );

      const response = await client.get(`${testUrl}/posts/1`, { timeout: 5000 });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Multiple timeouts', () => {
    void it('handles concurrent timeouts correctly', async () => {
      const requests = [
        client.get(`${testUrl}/delay`, { timeout: 50 }).catch(() => {
          return 'timeout1';
        }),
        client.get(`${testUrl}/delay`, { timeout: 60 }).catch(() => {
          return 'timeout2';
        }),
        client.get(`${testUrl}/posts/1`, { timeout: 5000 }).then(() => {
          return 'success';
        })
      ];

      const results = await Promise.all(requests);

      assert.strictEqual(results[0], 'timeout1');
      assert.strictEqual(results[1], 'timeout2');
      assert.strictEqual(results[2], 'success');
    });

    void it('different timeout values for different requests', async () => {
      const client = FetchClient.create({ baseURL: testUrl });

      await assert.rejects(
        async () => {
          await client.get('/delay', { timeout: 50 });
        },
        TimeoutError
      );

      const response = await client.get('/posts/1', { timeout: 5000 });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Timeout with default client timeout', () => {
    void it('uses client default timeout when not overridden', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        timeout: 50
      });

      await assert.rejects(
        async () => {
          await client.get('/delay');
        },
        TimeoutError
      );
    });

    void it('request timeout overrides client default', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        timeout: 50
      });

      const response = await client.get('/posts/1', { timeout: 5000 });

      assert.strictEqual(response.status, 200);
    });
  });

  void describe('Timeout error details', () => {
    void it('includes URL in error', async () => {
      try {
        await client.get(`${testUrl}/delay`, { timeout: 50 });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        if (error instanceof TimeoutError) {
          assert.ok(error.url.includes('127.0.0.1'));
          assert.ok(error.url.includes('/delay'));
        }
      }
    });

    void it('includes timeout value in error', async () => {
      try {
        await client.get(`${testUrl}/delay`, { timeout: 123 });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        if (error instanceof TimeoutError) {
          assert.strictEqual(error.timeoutMs, 123);
          assert.ok(error.message.includes('123'));
        }
      }
    });

    void it('error name is TimeoutError', async () => {
      try {
        await client.get(`${testUrl}/delay`, { timeout: 50 });
        assert.fail('Should have thrown TimeoutError');
      } catch (error) {
        assert.ok(error instanceof TimeoutError);
        if (error instanceof TimeoutError) {
          assert.strictEqual(error.name, 'TimeoutError');
        }
      }
    });
  });

  void describe('Timeout interaction with AbortController', () => {
    void it('timeout creates implicit AbortController', async () => {
      await assert.rejects(
        async () => {
          await client.get(`${testUrl}/delay`, { timeout: 50 });
        },
        TimeoutError
      );
    });

    void it('explicit signal overrides timeout behavior', async () => {
      const controller = new AbortController();

      setTimeout(() => {
        return controller.abort();
      }, 100);

      await assert.rejects(
        async () => {
          await client.get(`${testUrl}/delay`, {
            signal: controller.signal,
            timeout: 5000
          });
        },
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.ok(error.name === 'AbortError', 'Should be AbortError when explicit signal used');

          return true;
        }
      );
    });
  });

  void describe('Floating point timeout values', () => {
    void it('accepts integer timeout values', async () => {
      await assert.rejects(
        async () => {
          await client.get(`${testUrl}/delay`, { timeout: 50 });
        },
        TimeoutError
      );
    });

    void it('accepts floating point timeout values', async () => {
      await assert.rejects(
        async () => {
          await client.get(`${testUrl}/delay`, { timeout: 50.5 });
        },
        TimeoutError
      );
    });
  });
});
