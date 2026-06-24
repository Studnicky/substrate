import { doesNotThrow, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { FetchClient } from '../../../src/index.js';

const invalidRequestInterceptorScenarios: Array<{ description: string; value: unknown; messagePattern: RegExp }> = [
  {
    description: 'rejects non-function requestInterceptor',
    value: 'invalid',
    messagePattern: /requestInterceptor must be a function or array of functions/u,
  },
  {
    description: 'rejects array with non-function requestInterceptor',
    value: [async () => {}, 'invalid'],
    messagePattern: /requestInterceptor array must contain only functions/u,
  },
];

for (const { description, value, messagePattern } of invalidRequestInterceptorScenarios) {
  it(description, () => {
    throws(() => { FetchClient.create({ requestInterceptor: value as never }); }, messagePattern);
  });
}

it('accepts single requestInterceptor function', () => {
  doesNotThrow(() => {
    FetchClient.create({
      requestInterceptor: async (context) => {
        return {
          metadata: context.metadata,
          options: context.options,
          url: context.url,
        };
      },
    });
  });
});

it('accepts array of requestInterceptor functions', () => {
  doesNotThrow(() => {
    FetchClient.create({
      requestInterceptor: [
        async (context) => {
          return {
            metadata: context.metadata,
            options: context.options,
            url: context.url,
          };
        },
        async (context) => {
          return {
            metadata: context.metadata,
            options: context.options,
            url: context.url,
          };
        },
      ],
    });
  });
});

const invalidResponseInterceptorScenarios: Array<{ description: string; value: unknown; messagePattern: RegExp }> = [
  {
    description: 'rejects non-function responseInterceptor',
    value: 'invalid',
    messagePattern: /responseInterceptor must be a function or array of functions/u,
  },
  {
    description: 'rejects array with non-function responseInterceptor',
    value: [async () => {}, 'invalid'],
    messagePattern: /responseInterceptor array must contain only functions/u,
  },
];

for (const { description, value, messagePattern } of invalidResponseInterceptorScenarios) {
  it(description, () => {
    throws(() => { FetchClient.create({ responseInterceptor: value as never }); }, messagePattern);
  });
}

it('accepts single responseInterceptor function', () => {
  doesNotThrow(() => {
    FetchClient.create({
      responseInterceptor: async (context) => {
        return {
          request: context.request,
          response: context.response,
        };
      },
    });
  });
});

it('accepts array of responseInterceptor functions', () => {
  doesNotThrow(() => {
    FetchClient.create({
      responseInterceptor: [
        async (context) => {
          return {
            request: context.request,
            response: context.response,
          };
        },
        async (context) => {
          return {
            request: context.request,
            response: context.response,
          };
        },
      ],
    });
  });
});
