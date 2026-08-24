import assert from 'node:assert/strict';
import {
  afterEach, beforeEach, describe, it
} from 'node:test';

import {
  AbortError, ConnectTimeoutError, FetchClient, TimeoutError
} from '../../../src/index.js';

type RuntimeTag =
  | { shape: 'infinity' }
  | { shape: 'nan' }
  | { shape: 'negative-infinity' }
  | { shape: 'undefined' };

type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type RequestSignal =
  | { delayMs: number; shape: 'abort-after-ms' }
  | { shape: 'already-aborted' };

type ScenarioCase = {
  description: string;
  expected:
    | { shape: 'ok'; status: number; text?: string; url?: string }
    | { error: 'AbortError' | 'ConnectTimeoutError' | 'Error' | 'TimeoutError'; shape: 'reject'; messageIncludes?: readonly string[]; messagePattern?: string; timeoutMs?: number };
  input: {
    request: {
      args?: readonly [RuntimeValue?] | readonly [RuntimeValue?, Record<string, unknown>?];
      client?: {
        baseURL?: string;
        parameters?: Record<string, RuntimeValue>;
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
  name: string;
};

import scenarioGroups from './fetch.scenarios.json' with { type: 'json' };

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

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return typeof value === 'object' && value !== null && 'shape' in value;
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (value !== null && typeof value === 'object') {
    if (isRuntimeTag(value)) {
      if (value.shape === 'undefined') {
        return undefined;
      }

      if (value.shape === 'infinity') {
        return Number.POSITIVE_INFINITY;
      }

      if (value.shape === 'negative-infinity') {
        return Number.NEGATIVE_INFINITY;
      }

      if (value.shape === 'nan') {
        return Number.NaN;
      }

      const exhaustiveCheck: never = value;
      throw new Error(`Unknown runtime tag: ${JSON.stringify(exhaustiveCheck)}`);
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

  if (signal.shape === 'already-aborted') {
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

function buildOptions(request: ScenarioCase['input']['request']): {
  headers?: Record<string, string>;
  method?: 'GET';
  signal?: AbortSignal;
  timeout?: number;
} {
  const options = request.options ?? {};
  const timeout = request.timeout === undefined ? undefined : materializeRuntimeValue(request.timeout);
  const optionTimeout = options.timeout === undefined ? undefined : materializeRuntimeValue(options.timeout);
  const requestSignal = request.signal === undefined ? undefined : materializeSignal(request.signal);
  const optionSignal = options.signal === undefined ? undefined : materializeSignal(options.signal);

  return {
    ...(requestSignal === undefined ? {} : { signal: requestSignal }),
    ...(timeout === undefined ? {} : { timeout: timeout as number }),
    ...(options.headers === undefined ? {} : { headers: options.headers }),
    ...(options.method === undefined ? {} : { method: options.method }),
    ...(optionSignal === undefined ? {} : { signal: optionSignal }),
    ...(optionTimeout === undefined ? {} : { timeout: optionTimeout as number })
  };
}

function resolveUrl(request: ScenarioCase['input']['request']): string {
  if (request.url !== undefined) {
    return request.url;
  }

  return `https://example.test${request.path ?? ''}`;
}

function createClient(request: ScenarioCase['input']['request']): FetchClient {
  if (request.client === undefined) {
    return client;
  }

  return FetchClient.create({
    ...(request.client.baseURL === undefined ? {} : { baseURL: request.client.baseURL }),
    ...(request.client.parameters === undefined ? {} : { parameters: materializeRuntimeValue(request.client.parameters) as Record<string, string | number | boolean | null> })
  });
}

function buildNetworkError(message: string): Error {
  return new Error(`fetch failed: ${message}`);
}

async function waitForAbort(ms: number, signal?: AbortSignal | null): Promise<void> {
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

async function fakeFetch(input: Request | URL | string, init?: RequestInit): Promise<Response> {
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

async function invokeRequest(request: ScenarioCase['input']['request']): Promise<Response> {
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
  const { expected } = scenarioCase;
  if (expected.shape === 'reject') {
    await assert.rejects(async () => {
      await invokeRequest(scenarioCase.input.request);
    }, (error: Error) => {
      if (expected.error === 'AbortError') {
        assert.ok(error instanceof AbortError);
      } else if (expected.error === 'ConnectTimeoutError') {
        assert.ok(error instanceof ConnectTimeoutError);
      } else if (expected.error === 'TimeoutError') {
        assert.ok(error instanceof TimeoutError);
      } else {
        assert.ok(error instanceof Error);
      }

      if (expected.timeoutMs !== undefined && error instanceof TimeoutError) {
        assert.strictEqual(error.timeoutMs, expected.timeoutMs);
      }

      for (const expectedMessagePart of expected.messageIncludes ?? []) {
        assert.ok(error.message.includes(expectedMessagePart));
      }

      if (expected.messagePattern !== undefined) {
        assertMessagePattern(error.message, expected.messagePattern);
      }

      return true;
    });
    return;
  }

  const response = await invokeRequest(scenarioCase.input.request);
  assert.strictEqual(response.status, expected.status);
  if (expected.url !== undefined) {
    assert.strictEqual(lastFetchedUrl, expected.url);
  }
  if (expected.text !== undefined) {
    assert.strictEqual(await response.text(), expected.text);
  } else {
    await response.arrayBuffer();
  }
}

void describe('fetch wrapper', () => {
  void describe('URL validation', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('url-validation-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Timeout validation', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('timeout-validation-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Timeout functionality', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('timeout-functionality-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Signal handling', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('signal-handling-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Request without timeout', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('request-without-timeout-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Error handling', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('error-handling-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Edge cases', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('edge-case-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Signal cleanup', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('signal-cleanup-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('fetchWithoutTimeout path', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('fetch-without-timeout-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('timeout path', () => {
    for (const scenario of (scenarioGroups.cases as ScenarioCase[]).filter((item) => {
      return item.name.startsWith('timeout-path-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });
});
