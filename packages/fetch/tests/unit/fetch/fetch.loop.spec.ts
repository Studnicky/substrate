import assert from 'node:assert/strict';
import {
  afterEach, beforeEach, describe, it
} from 'node:test';

import {
  AbortError, ConnectTimeoutError, FetchClient, TimeoutError
} from '../../../src/index.js';

type RuntimeTag =
  | { __kind: 'infinity' }
  | { __kind: 'nan' }
  | { __kind: 'negative-infinity' }
  | { __kind: 'undefined' };

type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type RequestSignal =
  | { delayMs: number; kind: 'abort-after-ms' }
  | { kind: 'already-aborted' };

type ScenarioCase = {
  description: string;
  expect:
    | { kind: 'ok'; status: number; text?: string; url?: string }
    | { error: 'AbortError' | 'ConnectTimeoutError' | 'Error' | 'TimeoutError'; kind: 'reject'; messageIncludes?: readonly string[]; messagePattern?: string; timeoutMs?: number };
  name: string;
  request: {
    args?: readonly [RuntimeValue?] | readonly [RuntimeValue?, Record<string, unknown>?];
    client?: {
      baseURL?: string;
      params?: Record<string, RuntimeValue>;
    };
    options?: {
      headers?: Record<string, string>;
      method?: 'GET';
      requestId?: string;
      signal?: RequestSignal;
      timeout?: RuntimeValue;
    };
    path?: string;
    signal?: RequestSignal;
    timeout?: RuntimeValue;
    url?: string;
    invoke?: 'apply-get' | 'get';
  };
};

import scenarioGroups from './fetch.scenarios.json';

type MessagePatternPredicate = (message: string) => boolean;

const messagePatternPredicates: Record<string, MessagePatternPredicate> = {
  'ECONNREFUSED|fetch failed': (message) => message.includes('ECONNREFUSED') || message.includes('fetch failed'),
  'EAI_AGAIN|ENOTFOUND|fetch failed': (message) => message.includes('EAI_AGAIN') || message.includes('ENOTFOUND') || message.includes('fetch failed'),
  'timeout must be a positive number': (message) => message.includes('timeout must be a positive number'),
  'url must be a non-empty string': (message) => message.includes('url must be a non-empty string')
};

const originalFetch = globalThis.fetch;
const client = FetchClient.create();
let lastFetchedUrl = '';

void beforeEach(() => {
  globalThis.fetch = fakeFetch;
});

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function assertMessagePattern(message: string, pattern: string): void {
  const predicate = messagePatternPredicates[pattern];

  if (predicate === undefined) {
    throw new Error(`Unsupported fetch message pattern scenario: ${pattern}`);
  }

  assert.equal(predicate(message), true);
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (value !== null && typeof value === 'object') {
    if ('__kind' in value) {
      if (value.__kind === 'undefined') {
        return undefined;
      }

      if (value.__kind === 'infinity') {
        return Number.POSITIVE_INFINITY;
      }

      if (value.__kind === 'negative-infinity') {
        return Number.NEGATIVE_INFINITY;
      }

      if (value.__kind === 'nan') {
        return Number.NaN;
      }

      throw new Error(`Unknown runtime tag: ${value.__kind satisfies never}`);
    }

    const materialized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      materialized[key] = materializeRuntimeValue(entry as RuntimeValue);
    }

    return materialized;
  }

  return value;
}

function materializeSignal(signal: RequestSignal | undefined): AbortSignal | undefined {
  if (signal === undefined) {
    return undefined;
  }

  if (signal.kind === 'already-aborted') {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  }

  const controller = new AbortController();
  setTimeout(() => {
    controller.abort();
  }, signal.delayMs);
  return controller.signal;
}

function buildOptions(request: ScenarioCase['request']): {
  headers?: Record<string, string>;
  method?: 'GET';
  signal?: AbortSignal;
  timeout?: number;
} {
  const options = request.options ?? {};
  const timeout = request.timeout === undefined ? undefined : materializeRuntimeValue(request.timeout);
  const optionTimeout = options.timeout === undefined ? undefined : materializeRuntimeValue(options.timeout);

  return {
    ...(request.signal === undefined ? {} : { signal: materializeSignal(request.signal) }),
    ...(timeout === undefined ? {} : { timeout: timeout as number }),
    ...(options.headers === undefined ? {} : { headers: options.headers }),
    ...(options.method === undefined ? {} : { method: options.method }),
    ...(options.signal === undefined ? {} : { signal: materializeSignal(options.signal) }),
    ...(optionTimeout === undefined ? {} : { timeout: optionTimeout as number })
  };
}

function resolveUrl(request: ScenarioCase['request']): string {
  if (request.url !== undefined) {
    return request.url;
  }

  return `https://example.test${request.path ?? ''}`;
}

function createClient(request: ScenarioCase['request']): FetchClient {
  if (request.client === undefined) {
    return client;
  }

  return FetchClient.create({
    ...(request.client.baseURL === undefined ? {} : { baseURL: request.client.baseURL }),
    ...(request.client.params === undefined ? {} : { params: materializeRuntimeValue(request.client.params) as Record<string, string | number | boolean | null> })
  });
}

function buildNetworkError(message: string): Error {
  return new Error(`fetch failed: ${message}`);
}

async function waitForAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted === true) {
    throw abortError();
  }

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const cleanup = (): void => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    };

    const onAbort = (): void => {
      cleanup();
      reject(abortError());
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlString = String(input);
  lastFetchedUrl = urlString;
  const parsedUrl = new URL(urlString);
  const signal = init?.signal;

  if (signal?.aborted === true) {
    throw abortError();
  }

  if (parsedUrl.hostname === 'localhost' && parsedUrl.port === '1') {
    throw buildNetworkError('ECONNREFUSED 127.0.0.1:1');
  }

  if (parsedUrl.hostname.includes('definitely-does-not-exist')) {
    throw buildNetworkError(`ENOTFOUND ${parsedUrl.hostname}`);
  }

  if (parsedUrl.pathname === '/delay') {
    const delayMs = Number.parseInt(parsedUrl.searchParams.get('ms') ?? '100', 10);
    await waitForAbort(delayMs, signal);
    return new Response(`delayed ${delayMs}ms`, {
      headers: { 'Content-Type': 'text/plain' },
      status: 200
    });
  }

  if (parsedUrl.pathname === '/error') {
    return new Response('server error', {
      headers: { 'Content-Type': 'text/plain' },
      status: 500
    });
  }

  if (parsedUrl.pathname === '/error-unknown-code') {
    const error = new Error('unknown error') as Error & { code?: string };
    error.code = 'UND_ERR_SOMETHING_ELSE';
    throw error;
  }

  if (parsedUrl.pathname === '/error-connect') {
    const error = new Error('connect timeout') as Error & { code?: string };
    error.code = 'UND_ERR_CONNECT_TIMEOUT';
    throw error;
  }

  if (parsedUrl.pathname === '/instant') {
    return new Response('instant response', {
      headers: { 'Content-Type': 'text/plain' },
      status: 200
    });
  }

  return new Response('not found', {
    headers: { 'Content-Type': 'text/plain' },
    status: 404
  });
}

async function invokeRequest(request: ScenarioCase['request']): Promise<Response> {
  const url = resolveUrl(request);
  const options = buildOptions(request);
  const activeClient = createClient(request);
  const requestTarget = request.client === undefined ? url : (request.url ?? request.path ?? url);

  if (request.invoke === 'apply-get') {
    const args = [];
    const firstArg = request.args?.[0];
    args.push(firstArg === undefined ? undefined : materializeRuntimeValue(firstArg as RuntimeValue));
    if (request.args !== undefined && request.args.length > 1) {
      args.push(request.args[1] as Record<string, unknown>);
    }
    return Reflect.apply(activeClient.get, activeClient, args);
  }

  return activeClient.get(requestTarget, options);
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  if (scenarioCase.expect.kind === 'reject') {
    await assert.rejects(async () => {
      await invokeRequest(scenarioCase.request);
    }, (error: Error) => {
      if (scenarioCase.expect.error === 'AbortError') {
        assert.ok(error instanceof AbortError);
      } else if (scenarioCase.expect.error === 'ConnectTimeoutError') {
        assert.ok(error instanceof ConnectTimeoutError);
      } else if (scenarioCase.expect.error === 'TimeoutError') {
        assert.ok(error instanceof TimeoutError);
      } else {
        assert.ok(error instanceof Error);
      }

      if (scenarioCase.expect.timeoutMs !== undefined && error instanceof TimeoutError) {
        assert.strictEqual(error.timeoutMs, scenarioCase.expect.timeoutMs);
      }

      for (const expectedMessagePart of scenarioCase.expect.messageIncludes ?? []) {
        assert.ok(error.message.includes(expectedMessagePart));
      }

      if (scenarioCase.expect.messagePattern !== undefined) {
        assertMessagePattern(error.message, scenarioCase.expect.messagePattern);
      }

      return true;
    });
    return;
  }

  const response = await invokeRequest(scenarioCase.request);
  assert.strictEqual(response.status, scenarioCase.expect.status);
  if (scenarioCase.expect.url !== undefined) {
    assert.strictEqual(lastFetchedUrl, scenarioCase.expect.url);
  }
  if (scenarioCase.expect.text !== undefined) {
    assert.strictEqual(await response.text(), scenarioCase.expect.text);
  } else {
    await response.arrayBuffer();
  }
}

void describe('fetch wrapper', () => {
  void describe('URL validation', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('url-validation-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Timeout validation', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('timeout-validation-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Timeout functionality', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('timeout-functionality-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Signal handling', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('signal-handling-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Request without timeout', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('request-without-timeout-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Error handling', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('error-handling-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Edge cases', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('edge-case-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Signal cleanup', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('signal-cleanup-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('fetchWithoutTimeout path', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('fetch-without-timeout-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('timeout path', () => {
    for (const scenario of scenarioGroups.cases.filter((item) => {
      return item.name.startsWith('timeout-path-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });
});
