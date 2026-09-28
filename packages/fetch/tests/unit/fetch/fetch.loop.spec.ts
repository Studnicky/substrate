import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import {
  afterEach, beforeEach, describe, it
} from 'node:test';

import {
  AbortError, ConnectTimeoutError, FetchClient, TimeoutError
} from '../../../src/node/index.js';
import { QueryParametersEntity } from '../../../src/entities/QueryParametersEntity.js';
import { createRuntimeValueGuard } from '../../helpers/RuntimeValueGuard.js';

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
    throw RuntimeError.create(`Unsupported fetch message pattern scenario: ${pattern}`);
  }

  assert.equal(predicate(message), true);
}

const runtimeValueGuard = createRuntimeValueGuard(['infinity', 'nan', 'negative-infinity', 'undefined'] as const);

function isMessageIncludes(value: unknown): value is readonly string[] {
  return value === undefined || (Array.isArray(value) && value.every((fragment) => { return typeof fragment === 'string'; }));
}

function isRequestSignal(value: unknown): value is RequestSignal {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.shape === 'already-aborted') {
    return true;
  }
  return value.shape === 'abort-after-ms' && typeof value.delayMs === 'number';
}

function isRequestArgs(value: unknown): value is ScenarioCase['input']['request']['args'] {
  if (!Array.isArray(value) || value.length > 2) {
    return false;
  }
  if (value[0] !== undefined && !runtimeValueGuard.isRuntimeValue(value[0])) {
    return false;
  }
  return value[1] === undefined || Predicates.isObject(value[1]);
}

function isRequestOptions(value: unknown): value is NonNullable<ScenarioCase['input']['request']['options']> {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.headers !== undefined && !Predicates.isObject(value.headers)) {
    return false;
  }
  if (value.method !== undefined && value.method !== 'GET') {
    return false;
  }
  if (value.requestId !== undefined && typeof value.requestId !== 'string') {
    return false;
  }
  if (value.signal !== undefined && !isRequestSignal(value.signal)) {
    return false;
  }
  return value.timeout === undefined || runtimeValueGuard.isRuntimeValue(value.timeout);
}

function isRequestClient(value: unknown): value is NonNullable<ScenarioCase['input']['request']['client']> {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.baseURL !== undefined && typeof value.baseURL !== 'string') {
    return false;
  }
  return value.parameters === undefined || Predicates.isObject(value.parameters);
}

function isRequestDefinition(value: unknown): value is ScenarioCase['input']['request'] {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.args !== undefined && !isRequestArgs(value.args)) {
    return false;
  }
  if (value.client !== undefined && !isRequestClient(value.client)) {
    return false;
  }
  if (value.options !== undefined && !isRequestOptions(value.options)) {
    return false;
  }
  if (value.path !== undefined && typeof value.path !== 'string') {
    return false;
  }
  if (value.signal !== undefined && !isRequestSignal(value.signal)) {
    return false;
  }
  if (value.timeout !== undefined && !runtimeValueGuard.isRuntimeValue(value.timeout)) {
    return false;
  }
  if (value.url !== undefined && typeof value.url !== 'string') {
    return false;
  }
  return value.invoke === undefined || value.invoke === 'apply-get' || value.invoke === 'get';
}

function isScenarioExpectation(value: unknown): value is ScenarioCase['expected'] {
  if (!Predicates.isObject(value)) {
    return false;
  }
  if (value.shape === 'ok') {
    if (typeof value.status !== 'number') {
      return false;
    }
    if (value.text !== undefined && typeof value.text !== 'string') {
      return false;
    }
    return value.url === undefined || typeof value.url === 'string';
  }
  if (value.shape !== 'reject') {
    return false;
  }
  if (value.error !== 'AbortError' && value.error !== 'ConnectTimeoutError' && value.error !== 'Error' && value.error !== 'TimeoutError') {
    return false;
  }
  if (!isMessageIncludes(value.messageIncludes)) {
    return false;
  }
  if (value.messagePattern !== undefined && typeof value.messagePattern !== 'string') {
    return false;
  }
  return value.timeoutMs === undefined || typeof value.timeoutMs === 'number';
}

function isScenarioCase(value: unknown): value is ScenarioCase {
  return Predicates.isObject(value)
    && typeof value.description === 'string'
    && typeof value.name === 'string'
    && isScenarioExpectation(value.expected)
    && Predicates.isObject(value.input)
    && isRequestDefinition(value.input.request);
}

function isScenarioFile(value: unknown): value is { cases: ScenarioCase[] } {
  return Predicates.isObject(value) && Array.isArray(value.cases) && value.cases.every(isScenarioCase);
}

function requireScenarioFile(value: unknown): { cases: ScenarioCase[] } {
  if (!isScenarioFile(value)) {
    throw RuntimeError.create('fetch.scenarios.json does not match the expected scenario case shape');
  }
  return value;
}

const scenarioCases = requireScenarioFile(scenarioGroups).cases;

function buildUndiciError(message: string, code: string): Error {
  return Object.assign(RuntimeError.create(message), { code });
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
      throw RuntimeError.create(`Unknown runtime tag: ${JSON.stringify(exhaustiveCheck)}`);
    }

    const materialized: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(value)) {
      materialized[key] = materializeRuntimeValue(entry);
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

/**
 * `timeout` stays `unknown`: the timeout-validation scenarios deliberately materialize
 * non-number values (e.g. the string `"5000"`) to prove FetchClient's own runtime guard
 * (`assertValidRequestTimeout`) rejects them — there is no unknown-accepting public surface
 * to pre-validate through, so the malformed value must reach FetchClient itself.
 */
function buildOptions(request: ScenarioCase['input']['request']): {
  headers?: Record<string, string>;
  method?: 'GET';
  signal?: AbortSignal;
  timeout?: unknown;
} {
  const options = request.options ?? {};
  const timeout = request.timeout === undefined ? undefined : materializeRuntimeValue(request.timeout);
  const optionTimeout = options.timeout === undefined ? undefined : materializeRuntimeValue(options.timeout);
  const requestSignal = request.signal === undefined ? undefined : materializeSignal(request.signal);
  const optionSignal = options.signal === undefined ? undefined : materializeSignal(options.signal);

  return {
    ...(requestSignal === undefined ? {} : { signal: requestSignal }),
    ...(timeout === undefined ? {} : { timeout }),
    ...(options.headers === undefined ? {} : { headers: options.headers }),
    ...(options.method === undefined ? {} : { method: options.method }),
    ...(optionSignal === undefined ? {} : { signal: optionSignal }),
    ...(optionTimeout === undefined ? {} : { timeout: optionTimeout })
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
    ...(request.client.parameters === undefined ? {} : { parameters: QueryParametersEntity.intake(materializeRuntimeValue(request.client.parameters)) })
  });
}

function buildNetworkError(message: string): Error {
  return RuntimeError.create(`fetch failed: ${message}`);
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
    throw buildUndiciError('unknown error', 'UND_ERR_SOMETHING_ELSE');
  }

  if (parsedUrl.pathname === '/error-connect') {
    throw buildUndiciError('connect timeout', 'UND_ERR_CONNECT_TIMEOUT');
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
    const args: unknown[] = [];
    const firstArg = request.args?.[0];
    args.push(firstArg === undefined ? undefined : materializeRuntimeValue(firstArg));
    if (request.args !== undefined && request.args.length > 1) {
      args.push(request.args[1]);
    }
    return Reflect.apply(activeClient.get, activeClient, args);
  }

  return Reflect.apply(activeClient.get, activeClient, [requestTarget, options]);
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
    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('url-validation-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Timeout validation', () => {
    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('timeout-validation-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Timeout functionality', () => {
    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('timeout-functionality-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Signal handling', () => {
    void it('accepts a null native Fetch signal', async () => {
      const response = await client.get('https://example.test/instant', { 'signal': null });
      assert.equal(response.status, 200);
    });

    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('signal-handling-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Request without timeout', () => {
    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('request-without-timeout-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Error handling', () => {
    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('error-handling-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Edge cases', () => {
    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('edge-case-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('Signal cleanup', () => {
    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('signal-cleanup-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('fetchWithoutTimeout path', () => {
    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('fetch-without-timeout-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });

  void describe('timeout path', () => {
    for (const scenario of scenarioCases.filter((item) => {
      return item.name.startsWith('timeout-path-');
    })) {
      void it(scenario.name, async () => {
        await runCase(scenario);
      });
    }
  });
});
