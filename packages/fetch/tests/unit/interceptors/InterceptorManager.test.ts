import type { RequestMetadataType } from '../../../src/interfaces/RequestMetadataType.js';

import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import {
  InterceptorManager
} from '../../../src/index.js';

const createMockMetadata = (): RequestMetadataType => {
  return {
    metadata: {},
    method: 'GET',
    path: '/test',
    requestId: 'test-id'
  };
};

void describe('InterceptorManager', () => {
  void it('should create empty manager', () => {
    const manager = new InterceptorManager();

    assert.strictEqual(manager.requestInterceptors.length, 0);
    assert.strictEqual(manager.responseInterceptors.length, 0);
  });

  void describe('Request Interceptors', () => {
    void it('should add request interceptor', () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        return {
          metadata,
          options,
          url
        };
      });
      assert.strictEqual(manager.requestInterceptors.length, 1);
    });

    void it('should apply single request interceptor', async () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        return {
          metadata,
          options: {
            ...options,
            headers: {
              ...options.headers,
              'X-Custom': 'value'
            }
          },
          url
        };
      });

      const result = await manager.applyRequestInterceptors({
        metadata: createMockMetadata(),
        options: {},
        url: '/test'
      });

      assert.strictEqual(result.url, '/test');
      assert.deepStrictEqual(result.options.headers, { 'X-Custom': 'value' });
    });

    void it('should apply multiple request interceptors in order', async () => {
      const manager = new InterceptorManager();
      const order: number[] = [];

      manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        order.push(1);

        return {
          metadata,
          options: {
            ...options,
            headers: {
              ...options.headers,
              First: '1'
            }
          },
          url
        };
      });

      manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        order.push(2);

        return {
          metadata,
          options: {
            ...options,
            headers: {
              ...options.headers,
              Second: '2'
            }
          },
          url
        };
      });

      const result = await manager.applyRequestInterceptors({
        metadata: createMockMetadata(),
        options: {},
        url: '/test'
      });

      assert.deepStrictEqual(order, [
        1,
        2
      ]);
      assert.deepStrictEqual(result.options.headers, {
        First: '1',
        Second: '2'
      });
    });

    void it('should allow interceptor to modify URL', async () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        return {
          metadata,
          options,
          url: `${url}?modified=true`
        };
      });

      const result = await manager.applyRequestInterceptors({
        metadata: createMockMetadata(),
        options: {},
        url: '/test'
      });

      assert.strictEqual(result.url, '/test?modified=true');
    });

    void it('should allow interceptor to modify metadata', async () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        return {
          metadata: {
            ...metadata,
            metadata: {
              ...metadata.metadata,
              custom: 'value'
            }
          },
          options,
          url
        };
      });

      const result = await manager.applyRequestInterceptors({
        metadata: createMockMetadata(),
        options: {},
        url: '/test'
      });

      assert.deepStrictEqual(result.metadata.metadata, { custom: 'value' });
    });

    void it('should remove request interceptor', () => {
      const manager = new InterceptorManager();
      const remove = manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        return {
          metadata,
          options,
          url
        };
      });

      assert.strictEqual(manager.requestInterceptors.length, 1);

      remove();
      assert.strictEqual(manager.requestInterceptors.length, 0);
    });

    void it('should handle synchronous interceptors', async () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(({
        metadata, options, url
      }) => {
        return {
          metadata,
          options: {
            ...options,
            headers: {
              ...options.headers,
              Sync: 'true'
            }
          },
          url
        };
      });

      const result = await manager.applyRequestInterceptors({
        metadata: createMockMetadata(),
        options: {},
        url: '/test'
      });

      assert.deepStrictEqual(result.options.headers, { Sync: 'true' });
    });
  });

  void describe('Response Interceptors', () => {
    void it('should add response interceptor', () => {
      const manager = new InterceptorManager();

      manager.addResponseInterceptor(async ({
        request, response
      }) => {
        return {
          request,
          response
        };
      });
      assert.strictEqual(manager.responseInterceptors.length, 1);
    });

    void it('should apply single response interceptor', async () => {
      const manager = new InterceptorManager();
      const mockResponse = new Response('test', { status: 200 });
      const mockRequest = createMockMetadata();

      manager.addResponseInterceptor(async ({
        request, response
      }) => {
        const text = await response.text();

        return {
          request,
          response: new Response(text, {
            headers: { 'X-Modified': 'true' },
            status: response.status
          })
        };
      });

      const result = await manager.applyResponseInterceptors({
        request: mockRequest,
        response: mockResponse
      });

      assert.strictEqual(result.response.headers.get('X-Modified'), 'true');
    });

    void it('should apply multiple response interceptors in order', async () => {
      const manager = new InterceptorManager();
      const order: number[] = [];
      const mockResponse = new Response('test');
      const mockRequest = createMockMetadata();

      manager.addResponseInterceptor(async ({
        request, response
      }) => {
        order.push(1);

        return {
          request,
          response
        };
      });

      manager.addResponseInterceptor(async ({
        request, response
      }) => {
        order.push(2);

        return {
          request,
          response
        };
      });

      await manager.applyResponseInterceptors({
        request: mockRequest,
        response: mockResponse
      });
      assert.deepStrictEqual(order, [
        1,
        2
      ]);
    });

    void it('should allow interceptor to access request metadata', async () => {
      const manager = new InterceptorManager();
      const mockResponse = new Response('test');
      const mockRequest = createMockMetadata();

      let capturedRequestId: string | undefined;

      manager.addResponseInterceptor(async ({
        request, response
      }) => {
        capturedRequestId = request.requestId;

        return {
          request,
          response
        };
      });

      await manager.applyResponseInterceptors({
        request: mockRequest,
        response: mockResponse
      });

      assert.strictEqual(capturedRequestId, 'test-id');
    });

    void it('should remove response interceptor', () => {
      const manager = new InterceptorManager();
      const remove = manager.addResponseInterceptor(async ({
        request, response
      }) => {
        return {
          request,
          response
        };
      });

      assert.strictEqual(manager.responseInterceptors.length, 1);

      remove();
      assert.strictEqual(manager.responseInterceptors.length, 0);
    });

    void it('should handle synchronous interceptors', async () => {
      const manager = new InterceptorManager();
      const mockResponse = new Response('test');
      const mockRequest = createMockMetadata();

      manager.addResponseInterceptor(({
        request, response
      }) => {
        return {
          request,
          response: new Response('modified', { status: response.status })
        };
      });

      const result = await manager.applyResponseInterceptors({
        request: mockRequest,
        response: mockResponse
      });
      const text = await result.response.text();

      assert.strictEqual(text, 'modified');
    });
  });

  void describe('Clear Methods', () => {
    void it('should clear all request interceptors', () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        return {
          metadata,
          options,
          url
        };
      });
      manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        return {
          metadata,
          options,
          url
        };
      });
      assert.strictEqual(manager.requestInterceptors.length, 2);

      manager.clearRequestInterceptors();
      assert.strictEqual(manager.requestInterceptors.length, 0);
    });

    void it('should clear all response interceptors', () => {
      const manager = new InterceptorManager();

      manager.addResponseInterceptor(async ({
        request, response
      }) => {
        return {
          request,
          response
        };
      });
      manager.addResponseInterceptor(async ({
        request, response
      }) => {
        return {
          request,
          response
        };
      });
      assert.strictEqual(manager.responseInterceptors.length, 2);

      manager.clearResponseInterceptors();
      assert.strictEqual(manager.responseInterceptors.length, 0);
    });

    void it('should clear all interceptors', () => {
      const manager = new InterceptorManager();

      manager.addRequestInterceptor(async ({
        metadata, options, url
      }) => {
        return {
          metadata,
          options,
          url
        };
      });
      manager.addResponseInterceptor(async ({
        request, response
      }) => {
        return {
          request,
          response
        };
      });
      assert.strictEqual(manager.requestInterceptors.length, 1);
      assert.strictEqual(manager.responseInterceptors.length, 1);

      manager.clearAll();
      assert.strictEqual(manager.requestInterceptors.length, 0);
      assert.strictEqual(manager.responseInterceptors.length, 0);
    });
  });
});
