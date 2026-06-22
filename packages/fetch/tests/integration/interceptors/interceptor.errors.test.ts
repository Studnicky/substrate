import type { RequestInterceptorType } from '../../../src/types/RequestInterceptorType.js';
import type { ResponseInterceptorType } from '../../../src/types/ResponseInterceptorType.js';

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

// Module-level interceptors for reuse across tests
const syncErrorRequestInterceptor: RequestInterceptorType = (): never => {
  throw new Error('Request interceptor error');
};

const asyncErrorRequestInterceptor: RequestInterceptorType = async (): Promise<never> => {
  await Promise.resolve();
  throw new Error('Async request interceptor error');
};

const syncErrorResponseInterceptor: ResponseInterceptorType = (): never => {
  throw new Error('Response interceptor error');
};

const asyncErrorResponseInterceptor: ResponseInterceptorType = async (): Promise<never> => {
  await Promise.resolve();
  throw new Error('Async response interceptor error');
};

const passthroughRequestInterceptor: RequestInterceptorType = (context) => {
  return context;
};

const perRequestErrorInterceptor: RequestInterceptorType = (): never => {
  throw new Error('Per-request interceptor error');
};

const delayedAsyncErrorRequestInterceptor: RequestInterceptorType = async (): Promise<never> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });
  throw new Error('Delayed async error');
};

const delayedAsyncErrorResponseInterceptor: ResponseInterceptorType = async (): Promise<never> => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });
  throw new Error('Delayed response error');
};

const createErrorThrowingInterceptor = (error: Error): RequestInterceptorType => {
  return (): never => {
    throw error;
  };
};

void describe('Interceptor Error Scenarios', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('Request interceptor errors', () => {
    void it('propagates synchronous error from request interceptor', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: syncErrorRequestInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Request interceptor error');

          return true;
        }
      );
    });

    void it('propagates async error from request interceptor', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: asyncErrorRequestInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Async request interceptor error');

          return true;
        }
      );
    });

    void it('stops request execution when interceptor throws', async () => {
      let requestMade = false;
      const errorInterceptor: RequestInterceptorType = () => {
        throw new Error('Interceptor error');
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: errorInterceptor
      });

      await assert.rejects(
        async () => {
          const response = await client.get('/posts/1');

          requestMade = true;

          return response;
        },
        Error
      );

      assert.strictEqual(requestMade, false, 'Request should not be made after interceptor error');
    });

    void it('handles TypeError in request interceptor', async () => {
      const errorInterceptor: RequestInterceptorType = () => {
        const obj = null as unknown as { property: string };

        throw new TypeError(`Cannot read property 'property' of ${String(obj)}`);
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: errorInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        TypeError
      );
    });
  });

  void describe('Response interceptor errors', () => {
    void it('propagates synchronous error from response interceptor', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        responseInterceptor: syncErrorResponseInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Response interceptor error');

          return true;
        }
      );
    });

    void it('propagates async error from response interceptor', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        responseInterceptor: asyncErrorResponseInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Async response interceptor error');

          return true;
        }
      );
    });

    void it('handles error after successful response', async () => {
      const errorInterceptor: ResponseInterceptorType = (context) => {
        assert.strictEqual(context.response.status, 200, 'Response should be successful before error');
        throw new Error('Response interceptor error after success');
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        responseInterceptor: errorInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Response interceptor error after success');

          return true;
        }
      );
    });
  });

  void describe('Interceptor chain error propagation', () => {
    void it('stops chain when first request interceptor throws', async () => {
      let secondInterceptorCalled = false;

      const firstInterceptor: RequestInterceptorType = () => {
        throw new Error('First interceptor error');
      };

      const secondInterceptor: RequestInterceptorType = (context) => {
        secondInterceptorCalled = true;

        return context;
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: [
          firstInterceptor,
          secondInterceptor
        ]
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        Error
      );

      assert.strictEqual(secondInterceptorCalled, false, 'Second interceptor should not be called');
    });

    void it('stops chain when middle request interceptor throws', async () => {
      let thirdInterceptorCalled = false;

      const middleErrorInterceptor: RequestInterceptorType = (): never => {
        throw new Error('Middle interceptor error');
      };

      const trackingInterceptor: RequestInterceptorType = (context) => {
        thirdInterceptorCalled = true;

        return context;
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: [
          passthroughRequestInterceptor,
          middleErrorInterceptor,
          trackingInterceptor
        ]
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        Error
      );

      assert.strictEqual(thirdInterceptorCalled, false, 'Third interceptor should not be called');
    });

    void it('stops chain when first response interceptor throws', async () => {
      let secondInterceptorCalled = false;

      const firstInterceptor: ResponseInterceptorType = () => {
        throw new Error('First response interceptor error');
      };

      const secondInterceptor: ResponseInterceptorType = (response) => {
        secondInterceptorCalled = true;

        return response;
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        responseInterceptor: [
          firstInterceptor,
          secondInterceptor
        ]
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        Error
      );

      assert.strictEqual(secondInterceptorCalled, false, 'Second interceptor should not be called');
    });
  });

  void describe('Per-request interceptor errors', () => {
    void it('propagates error from per-request interceptor', async () => {
      const client = FetchClient.create({ baseURL: testUrl });

      await assert.rejects(
        async () => {
          await client.get('/posts/1', { requestInterceptor: perRequestErrorInterceptor });
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Per-request interceptor error');

          return true;
        }
      );
    });

    void it('per-request interceptor error stops client interceptors', async () => {
      let clientInterceptorCalled = false;

      const perRequestInterceptor: RequestInterceptorType = () => {
        throw new Error('Per-request error');
      };

      const clientInterceptor: RequestInterceptorType = (context) => {
        clientInterceptorCalled = true;

        return context;
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: clientInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1', { requestInterceptor: perRequestInterceptor });
        },
        Error
      );

      assert.strictEqual(clientInterceptorCalled, true, 'Client interceptor runs before per-request');
    });
  });

  void describe('Invalid interceptor configurations', () => {
    void it('rejects non-function request interceptor', () => {
      assert.throws(
        () => {
          FetchClient.create({
            baseURL: testUrl,
            requestInterceptor: 'not-a-function' as unknown as RequestInterceptorType
          });
        },
        (error: Error) => {
          assert.ok(error.message.toLowerCase().includes('interceptor'));

          return true;
        }
      );
    });

    void it('rejects non-function response interceptor', () => {
      assert.throws(
        () => {
          FetchClient.create({
            baseURL: testUrl,
            responseInterceptor: 123 as unknown as ResponseInterceptorType
          });
        },
        (error: Error) => {
          assert.ok(error.message.toLowerCase().includes('interceptor'));

          return true;
        }
      );
    });

    void it('rejects array with non-function request interceptor', () => {
      assert.throws(
        () => {
          FetchClient.create({
            baseURL: testUrl,
            requestInterceptor: [
              (ctx) => {
                return ctx;
              },
              'not-a-function' as unknown as RequestInterceptorType
            ]
          });
        },
        (error: Error) => {
          assert.ok(error.message.toLowerCase().includes('interceptor'));

          return true;
        }
      );
    });

    void it('rejects array with non-function response interceptor', () => {
      assert.throws(
        () => {
          FetchClient.create({
            baseURL: testUrl,
            responseInterceptor: [
              (res) => {
                return res;
              },
              null as unknown as ResponseInterceptorType
            ]
          });
        },
        (error: Error) => {
          assert.ok(error.message.toLowerCase().includes('interceptor'));

          return true;
        }
      );
    });

    void it('accepts empty array for request interceptor', () => {
      assert.doesNotThrow(() => {
        FetchClient.create({
          baseURL: testUrl,
          requestInterceptor: [] as unknown as RequestInterceptorType[]
        });
      });
    });

    void it('accepts empty array for response interceptor', () => {
      assert.doesNotThrow(() => {
        FetchClient.create({
          baseURL: testUrl,
          responseInterceptor: [] as unknown as ResponseInterceptorType[]
        });
      });
    });
  });

  void describe('Interceptor error with request context', () => {
    void it('has access to URL when request interceptor fails', async () => {
      const errorInterceptor: RequestInterceptorType = (context) => {
        assert.ok(context.url.includes('/posts/1'), 'Context should have URL');
        throw new Error('Request interceptor with context');
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: errorInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Request interceptor with context');

          return true;
        }
      );
    });

    void it('has access to response when response interceptor fails', async () => {
      const errorInterceptor: ResponseInterceptorType = (context) => {
        assert.strictEqual(context.response.status, 200, 'Should have response');
        throw new Error('Response interceptor with response');
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        responseInterceptor: errorInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Response interceptor with response');

          return true;
        }
      );
    });
  });

  void describe('Async timing with interceptor errors', () => {
    void it('handles delayed async error in request interceptor', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: delayedAsyncErrorRequestInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Delayed async error');

          return true;
        }
      );
    });

    void it('handles delayed async error in response interceptor', async () => {
      const client = FetchClient.create({
        baseURL: testUrl,
        responseInterceptor: delayedAsyncErrorResponseInterceptor
      });

      await assert.rejects(
        async () => {
          await client.get('/posts/1');
        },
        (error: Error) => {
          assert.strictEqual(error.message, 'Delayed response error');

          return true;
        }
      );
    });
  });

  void describe('Error types in interceptors', () => {
    const errorScenarios = [
      {
        description: 'Error instance',
        error: new Error('Standard Error')
      },
      {
        description: 'TypeError instance',
        error: new TypeError('Type Error')
      },
      {
        description: 'RangeError instance',
        error: new RangeError('Range Error')
      },
      {
        description: 'string error',
        error: new Error('String error message')
      },
      {
        description: 'number error',
        error: new Error('500')
      },
      {
        description: 'object error',
        error: new Error('ERR_TEST')
      }
    ];

    for (const {
      description, error: testError
    } of errorScenarios) {
      const baseUrl = testUrl;

      void it(`propagates ${description} from request interceptor`, async () => {
        const client = FetchClient.create({
          baseURL: baseUrl,
          requestInterceptor: createErrorThrowingInterceptor(testError)
        });

        await assert.rejects(
          async () => {
            await client.get('/posts/1');
          },
          (error: unknown) => {
            if (testError instanceof Error) {
              assert.ok(error instanceof Error);
              assert.strictEqual((error).message, testError.message);
            } else {
              assert.deepStrictEqual(error, testError);
            }

            return true;
          }
        );
      });
    }
  });

  void describe('Multiple concurrent requests with failing interceptors', () => {
    void it('isolates errors between concurrent requests', async () => {
      let requestCount = 0;
      const errorInterceptor: RequestInterceptorType = (context) => {
        requestCount++;
        if (requestCount === 2) {
          throw new Error('Second request fails');
        }

        return context;
      };

      const client = FetchClient.create({
        baseURL: testUrl,
        requestInterceptor: errorInterceptor
      });

      const results = await Promise.allSettled([
        client.get('/posts/1'),
        client.get('/posts/2'),
        client.get('/posts/3')
      ]);

      assert.strictEqual(results[0].status, 'fulfilled', 'First request should succeed');
      assert.strictEqual(results[1].status, 'rejected', 'Second request should fail');
      assert.strictEqual(results[2].status, 'fulfilled', 'Third request should succeed');
    });
  });
});
