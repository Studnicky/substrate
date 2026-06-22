import assert from 'node:assert';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

void describe('FetchClient Interceptors', () => {
  let testUrl: string;

  before(async () => {
    testUrl = await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  void describe('Config interceptors', () => {
    void it('should add authentication header via request interceptor', async () => {
      const client = FetchClient.create({
        requestInterceptor: async ({
          metadata, options, url
        }) => {
          options.headers = {
            ...options.headers,
            Authorization: 'Bearer test-token-12345'
          };

          return {
            metadata,
            options,
            url
          };
        }
      });

      const response = await client.get(`${testUrl}/posts/1`);

      assert.strictEqual(response.status, 200);
      const data = await response.json() as { headers: Record<string, string> };

      assert.strictEqual(data.headers.authorization, 'Bearer test-token-12345');
    });

    void it('should count requests via response interceptor', async () => {
      let requestCount = 0;

      const client = FetchClient.create({
        responseInterceptor: async ({
          request, response
        }) => {
          requestCount++;

          return {
            request,
            response
          };
        }
      });

      await client.get(`${testUrl}/posts/1`);
      await client.get(`${testUrl}/posts/2`);
      await client.get(`${testUrl}/posts/3`);

      assert.strictEqual(requestCount, 3);
    });

    void it('should add multiple headers via chained request interceptors', async () => {
      const client = FetchClient.create({
        requestInterceptor: [
          async ({
            metadata, options, url
          }) => {
            options.headers = {
              ...options.headers,
              'X-API-Key': 'api-key-xyz'
            };

            return {
              metadata,
              options,
              url
            };
          },
          async ({
            metadata, options, url
          }) => {
            options.headers = {
              ...options.headers,
              'User-Agent': 'MyApp/1.0.0'
            };

            return {
              metadata,
              options,
              url
            };
          },
          async ({
            metadata, options, url
          }) => {
            options.headers = {
              ...options.headers,
              'X-Request-ID': metadata.requestId
            };

            return {
              metadata,
              options,
              url
            };
          }
        ]
      });

      const response = await client.get(`${testUrl}/posts/1`);
      const data = await response.json() as { headers: Record<string, string> };

      assert.strictEqual(data.headers['x-api-key'], 'api-key-xyz');
      assert.strictEqual(data.headers['user-agent'], 'MyApp/1.0.0');
      assert.match(data.headers['x-request-id'] ?? '', /^.+$/u);
    });

    void it('should collect response metrics via chained response interceptors', async () => {
      const metrics = {
        requestCount: 0,
        statusCodes: [] as number[],
        totalDuration: 0
      };

      const client = FetchClient.create({
        responseInterceptor: [
          async ({
            request, response
          }) => {
            metrics.requestCount++;

            return {
              request,
              response
            };
          },
          async ({
            request, response
          }) => {
            metrics.statusCodes.push(response.status);

            return {
              request,
              response
            };
          },
          async ({
            request, response
          }) => {
            metrics.totalDuration += 100;

            return {
              request,
              response
            };
          }
        ]
      });

      await client.get(`${testUrl}/posts/1`);
      await client.get(`${testUrl}/posts/2`);

      assert.strictEqual(metrics.requestCount, 2);
      assert.deepStrictEqual(metrics.statusCodes, [
        200,
        200
      ]);
      assert.strictEqual(metrics.totalDuration, 200);
    });
  });

  void describe('Builder interceptors', () => {
    void it('should add custom header via builder request interceptor', async () => {
      const client = FetchClient.create();

      const response = await client
        .request(`${testUrl}/posts/1`)
        .requestInterceptor(async ({
          metadata, options, url
        }) => {
          options.headers = {
            ...options.headers,
            'X-Custom-Header': 'custom-value'
          };

          return {
            metadata,
            options,
            url
          };
        })
        .get();

      const data = await response.json() as { headers: Record<string, string> };

      assert.strictEqual(data.headers['x-custom-header'], 'custom-value');
    });

    void it('should validate response status via builder response interceptor', async () => {
      let statusValidated = false;

      const client = FetchClient.create();

      await client
        .request(`${testUrl}/posts/1`)
        .responseInterceptor(async ({
          request, response
        }) => {
          if (response.status >= 200 && response.status < 300) {
            statusValidated = true;
          }

          return {
            request,
            response
          };
        })
        .get();

      assert.strictEqual(statusValidated, true);
    });

    void it('should add auth and custom headers via builder chaining', async () => {
      const client = FetchClient.create();

      const response = await client
        .request(`${testUrl}/posts/1`)
        .requestInterceptor(async ({
          metadata, options, url
        }) => {
          options.headers = {
            ...options.headers,
            Authorization: 'Bearer session-token'
          };

          return {
            metadata,
            options,
            url
          };
        })
        .requestInterceptor(async ({
          metadata, options, url
        }) => {
          options.headers = {
            ...options.headers,
            'X-Tenant-ID': 'tenant-123'
          };

          return {
            metadata,
            options,
            url
          };
        })
        .requestInterceptor(async ({
          metadata, options, url
        }) => {
          options.headers = {
            ...options.headers,
            'X-Correlation-ID': metadata.requestId
          };

          return {
            metadata,
            options,
            url
          };
        })
        .get();

      const data = await response.json() as { headers: Record<string, string> };

      assert.strictEqual(data.headers.authorization, 'Bearer session-token');
      assert.strictEqual(data.headers['x-tenant-id'], 'tenant-123');
      assert.match(data.headers['x-correlation-id'] ?? '', /^.+$/u);
    });

    void it('should add headers via builder array', async () => {
      const client = FetchClient.create();

      const response = await client
        .request(`${testUrl}/posts/1`)
        .requestInterceptor([
          async ({
            metadata, options, url
          }) => {
            options.headers = {
              ...options.headers,
              'X-App-Name': 'MyApp'
            };

            return {
              metadata,
              options,
              url
            };
          },
          async ({
            metadata, options, url
          }) => {
            options.headers = {
              ...options.headers,
              'X-App-Version': '2.0.0'
            };

            return {
              metadata,
              options,
              url
            };
          },
          async ({
            metadata, options, url
          }) => {
            options.headers = {
              ...options.headers,
              'X-Environment': 'production'
            };

            return {
              metadata,
              options,
              url
            };
          }
        ])
        .get();

      const data = await response.json() as { headers: Record<string, string> };

      assert.strictEqual(data.headers['x-app-name'], 'MyApp');
      assert.strictEqual(data.headers['x-app-version'], '2.0.0');
      assert.strictEqual(data.headers['x-environment'], 'production');
    });

    void it('should track response metrics via builder chaining', async () => {
      const metrics = {
        received: false,
        statusOk: false
      };

      const client = FetchClient.create();

      await client
        .request(`${testUrl}/posts/1`)
        .responseInterceptor(async ({
          request, response
        }) => {
          metrics.received = true;

          return {
            request,
            response
          };
        })
        .responseInterceptor(async ({
          request, response
        }) => {
          metrics.statusOk = response.ok;

          return {
            request,
            response
          };
        })
        .get();

      assert.strictEqual(metrics.received, true);
      assert.strictEqual(metrics.statusOk, true);
    });
  });

  void describe('Combined config and builder interceptors', () => {
    void it('should apply both config auth and builder custom headers', async () => {
      const client = FetchClient.create({
        requestInterceptor: async ({
          metadata, options, url
        }) => {
          options.headers = {
            ...options.headers,
            Authorization: 'Bearer config-token'
          };

          return {
            metadata,
            options,
            url
          };
        }
      });

      const response = await client
        .request(`${testUrl}/posts/1`)
        .requestInterceptor(async ({
          metadata, options, url
        }) => {
          options.headers = {
            ...options.headers,
            'X-Request-Source': 'dashboard'
          };

          return {
            metadata,
            options,
            url
          };
        })
        .get();

      const data = await response.json() as { headers: Record<string, string> };

      assert.strictEqual(data.headers.authorization, 'Bearer config-token');
      assert.strictEqual(data.headers['x-request-source'], 'dashboard');
    });

    void it('should apply headers in correct order: config then builder', async () => {
      const headersAdded: string[] = [];

      const client = FetchClient.create({
        requestInterceptor: [
          async ({
            metadata, options, url
          }) => {
            headersAdded.push('API-Key');
            options.headers = {
              ...options.headers,
              'X-API-Key': 'key-123'
            };

            return {
              metadata,
              options,
              url
            };
          },
          async ({
            metadata, options, url
          }) => {
            headersAdded.push('User-Agent');
            options.headers = {
              ...options.headers,
              'User-Agent': 'ConfigApp/1.0'
            };

            return {
              metadata,
              options,
              url
            };
          }
        ]
      });

      await client
        .request(`${testUrl}/posts/1`)
        .requestInterceptor(async ({
          metadata, options, url
        }) => {
          headersAdded.push('Request-ID');
          options.headers = {
            ...options.headers,
            'X-Request-ID': metadata.requestId
          };

          return {
            metadata,
            options,
            url
          };
        })
        .requestInterceptor(async ({
          metadata, options, url
        }) => {
          headersAdded.push('Tenant-ID');
          options.headers = {
            ...options.headers,
            'X-Tenant-ID': 'tenant-456'
          };

          return {
            metadata,
            options,
            url
          };
        })
        .get();

      assert.deepStrictEqual(headersAdded, [
        'API-Key',
        'User-Agent',
        'Request-ID',
        'Tenant-ID'
      ]);
    });
  });
});
