import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { RequestContextInterface } from '../../../src/interfaces/RequestContextInterface.js';
import type { ResponseContextInterface } from '../../../src/interfaces/ResponseContextInterface.js';
import { FetchClient } from '../../../src/index.js';
import scenarioGroups from './override-hooks.scenarios.json';

type ScenarioCase =
  | {
      description: string;
      expected: { entries?: string[]; header?: string; messageIncludes?: string[]; status?: number; value?: string | null; count?: number };
      input: { baseURL: string };
      name: string;
      operation: 'base-on-request' | 'request-header-injection' | 'hook-pipeline' | 'url-rewrite' | 'base-on-response' | 'response-wrap' | 'response-reject' | 'metadata';
    };

const originalFetch = globalThis.fetch;

void beforeEach(() => {
  globalThis.fetch = fakeFetch;
});

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

function toPlainHeaders(headers: HeadersInit | undefined): Record<string, string> {
  const normalized = new Headers(headers);
  const result: Record<string, string> = {};

  for (const [key, value] of normalized.entries()) {
    result[key] = value;
  }

  return result;
}

function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));

  if (url.pathname === '/echo-headers') {
    return Promise.resolve(new Response(JSON.stringify({ headers: toPlainHeaders(init?.headers) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    }));
  }

  if (url.pathname === '/ok') {
    return Promise.resolve(new Response(JSON.stringify({ value: 'original' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    }));
  }

  return Promise.resolve(new Response('', { status: 404 }));
}

function clientConfig(scenarioCase: ScenarioCase): Parameters<typeof FetchClient.create>[0] {
  return { baseURL: scenarioCase.input.baseURL };
}

const runnerMap: Record<ScenarioCase['operation'], (scenarioCase: ScenarioCase) => Promise<void>> = {
  'request-header-injection': async (scenarioCase) => {
    class HeaderInjectClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): HeaderInjectClient {
        return new this(config);
      }

      protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
        return {
          ...context,
          options: {
            ...context.options,
            headers: {
              ...context.options.headers,
              'X-Injected': 'hook-value'
            }
          }
        };
      }
    }

    const client = HeaderInjectClient.create(clientConfig(scenarioCase));

    try {
      const response = await client.get('/echo-headers');
      const data = await response.json() as { headers: Record<string, string> };
      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.headers['x-injected'], scenarioCase.expected.value === '__UNDEFINED__' ? undefined : scenarioCase.expected.value);
      assert.strictEqual('x-injected' in data.headers, true);
    } finally {
      await client.destroy();
    }
  },
  'url-rewrite': async (scenarioCase) => {
    const visitedUrls: string[] = [];

    class UrlRewriteClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): UrlRewriteClient {
        return new this(config);
      }

      protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
        visitedUrls.push(context.url);
        return { ...context, url: context.url.replace('/original-path', '/ok') };
      }
    }

    const client = UrlRewriteClient.create(clientConfig(scenarioCase));

    try {
      const response = await client.get('/original-path');
      assert.strictEqual(response.status, 200);
      assert.ok(visitedUrls[0]?.includes('/original-path'));
      assert.deepStrictEqual(visitedUrls, scenarioCase.expected.entries);
      await response.arrayBuffer();
    } finally {
      await client.destroy();
    }
  },
  'base-on-request': async (scenarioCase) => {
    const client = FetchClient.create(clientConfig(scenarioCase));

    try {
      const response = await client.get('/echo-headers');
      const data = await response.json() as { headers: Record<string, string> };
      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.headers['x-injected'], scenarioCase.expected.value === '__UNDEFINED__' ? undefined : scenarioCase.expected.value);
    } finally {
      await client.destroy();
    }
  },
  'response-wrap': async (scenarioCase) => {
    class ResponseWrapClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): ResponseWrapClient {
        return new this(config);
      }

      protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
        const body = await context.response.text();
        const wrapped = new Response(body, {
          headers: {
            'Content-Type': 'application/json',
            'X-Transformed': 'yes'
          },
          status: context.response.status
        });
        return { ...context, response: wrapped };
      }
    }

    const client = ResponseWrapClient.create(clientConfig(scenarioCase));

    try {
      const response = await client.get('/ok');
      assert.strictEqual(response.status, scenarioCase.expected.status);
      assert.strictEqual(response.headers.get('x-transformed'), 'yes');
    } finally {
      await client.destroy();
    }
  },
  'response-reject': async (scenarioCase) => {
    class StrictClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): StrictClient {
        return new this(config);
      }

      protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
        if (!context.response.ok) {
          throw new Error(`HTTP error: ${context.response.status}`);
        }
        return context;
      }
    }

    const client = StrictClient.create(clientConfig(scenarioCase));

    try {
      await assert.rejects(
        () => client.get('/nonexistent'),
        (error: Error) => {
          for (const expectedMessagePart of scenarioCase.expected.messageIncludes) {
            assert.ok(error.message.includes(expectedMessagePart));
          }
          return true;
        }
      );
    } finally {
      await client.destroy();
    }
  },
  'base-on-response': async (scenarioCase) => {
    const client = FetchClient.create(clientConfig(scenarioCase));

    try {
      const response = await client.get('/ok');
      const data = await response.json() as { value: string };
      assert.strictEqual(response.status, scenarioCase.expected.status);
      assert.strictEqual(data.value, 'original');
      assert.strictEqual(response.headers.get('x-transformed'), null);
    } finally {
      await client.destroy();
    }
  },
  metadata: async (scenarioCase) => {
    const capturedRequestIds: string[] = [];

    class MetadataClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): MetadataClient {
        return new this(config);
      }

      protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
        capturedRequestIds.push(context.request.requestId);
        return context;
      }
    }

    const client = MetadataClient.create(clientConfig(scenarioCase));

    try {
      await client.get('/ok');
      assert.strictEqual(capturedRequestIds.length, scenarioCase.expected.count);
      assert.ok(typeof capturedRequestIds[0] === 'string' && capturedRequestIds[0].length > 0);
    } finally {
      await client.destroy();
    }
  },
  'hook-pipeline': async (scenarioCase) => {
    const log: string[] = [];

    class PipelineClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): PipelineClient {
        return new this(config);
      }

      protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
        log.push('onRequest');
        return {
          ...context,
          options: {
            ...context.options,
            headers: { ...context.options.headers, 'X-Pipeline': 'request-stage' }
          }
        };
      }

      protected override async onResponse(context: ResponseContextInterface): Promise<ResponseContextInterface> {
        log.push('onResponse');
        return context;
      }
    }

    const client = PipelineClient.create(clientConfig(scenarioCase));

    try {
      const response = await client.get('/echo-headers');
      const data = await response.json() as { headers: Record<string, string> };
      assert.deepStrictEqual(log, scenarioCase.expected.entries);
      assert.strictEqual(data.headers['x-pipeline'], 'request-stage');
    } finally {
      await client.destroy();
    }
  }
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await runnerMap[scenarioCase.operation](scenarioCase);
}

void describe('hook override behavior', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
