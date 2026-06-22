import assert from 'node:assert';
import {
  describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';

void describe('interceptor validation', () => {
  void it('should reject non-function requestInterceptor', () => {
    assert.throws(() => {
      FetchClient.create({ requestInterceptor: 'invalid' as never });
    }, /requestInterceptor must be a function or array of functions/u);
  });

  void it('should reject array with non-function requestInterceptor', () => {
    assert.throws(() => {
      FetchClient.create({
        requestInterceptor: [
          async () => {},
          'invalid'
        ] as never
      });
    }, /requestInterceptor array must contain only functions/u);
  });

  void it('should accept single requestInterceptor function', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({
        requestInterceptor: async (context) => {
          return {
            metadata: context.metadata,
            options: context.options,
            url: context.url
          };
        }
      });
    });
  });

  void it('should accept array of requestInterceptor functions', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({
        requestInterceptor: [
          async (context) => {
            return {
              metadata: context.metadata,
              options: context.options,
              url: context.url
            };
          },
          async (context) => {
            return {
              metadata: context.metadata,
              options: context.options,
              url: context.url
            };
          }
        ]
      });
    });
  });

  void it('should reject non-function responseInterceptor', () => {
    assert.throws(() => {
      FetchClient.create({ responseInterceptor: 'invalid' as never });
    }, /responseInterceptor must be a function or array of functions/u);
  });

  void it('should reject array with non-function responseInterceptor', () => {
    assert.throws(() => {
      FetchClient.create({
        responseInterceptor: [
          async () => {},
          'invalid'
        ] as never
      });
    }, /responseInterceptor array must contain only functions/u);
  });

  void it('should accept single responseInterceptor function', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({
        responseInterceptor: async (context) => {
          return {
            request: context.request,
            response: context.response
          };
        }
      });
    });
  });

  void it('should accept array of responseInterceptor functions', () => {
    assert.doesNotThrow(() => {
      FetchClient.create({
        responseInterceptor: [
          async (context) => {
            return {
              request: context.request,
              response: context.response
            };
          },
          async (context) => {
            return {
              request: context.request,
              response: context.response
            };
          }
        ]
      });
    });
  });
});
