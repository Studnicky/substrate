import assert from 'node:assert/strict';
import {
  afterEach, beforeEach, describe, it
} from 'node:test';

import { HookInvocationError, HookTimeoutError } from '@studnicky/errors';

import {
  FetchClient,
} from '../../../src/index.js';
import scenarioGroups from './lifecycle-hooks.scenarios.json' with { type: 'json' };

type HookEvent = { 'hook': string; 'args': unknown[] };

type FetchClientConfig = NonNullable<Parameters<typeof FetchClient.create>[0]>;

type ScenarioExpected = {
  readonly count: number;
  readonly events: string[];
  readonly hook: string;
  readonly hookName: string;
  readonly message?: string;
  readonly status: number;
  readonly timeoutMs: number;
};

type ScenarioInput = {
  readonly abortAfterMs: number;
  readonly dispatcher: FetchClientConfig['dispatcher'];
  readonly hookTimeoutMs: number;
  readonly message: string;
  readonly method: string;
  readonly path: string;
  readonly settleMs: number;
  readonly timeoutMs: number;
};

type ScenarioCase = {
  description: string;
  expected: ScenarioExpected;
  input: ScenarioInput;
  name: string;
  operation:
    | 'abort-event'
    | 'abort-event-preaborted'
  | 'dispatcher-destroy'
  | 'dispatcher-destroy-with-timeout'
  | 'dispatcher-destroy-no-dispatcher'
  | 'fast-hook'
    | 'hook-timeout'
    | 'never-settles'
  | 'request-start'
  | 'response-error'
  | 'response-success'
  | 'timeout-event'
  | 'throw-timeout'
  | 'throw-fetch-string'
  | 'throw-fetch-error'
  | 'throw-request-error-string'
  | 'throw-dispatcher-destroy'
  | 'throw-request-error'
  | 'throw-request-start'
    | 'throw-response-success'
    | 'undici-error-wrap';
};

const originalFetch = globalThis.fetch;
const baseURL = 'https://example.test';

class HookedClient extends FetchClient {
  readonly events: HookEvent[] = [];

  protected override onRequestStart(method: string, path: string, requestId: string, url: string): void {
    this.events.push({ 'hook': 'onRequestStart', 'args': [method, path, requestId, url] });
  }

  protected override onResponseSuccess(method: string, requestId: string, statusCode: number, durationMs: number): void {
    this.events.push({ 'hook': 'onResponseSuccess', 'args': [method, requestId, statusCode, durationMs] });
  }

  protected override onResponseError(method: string, requestId: string, statusCode: number, durationMs: number): void {
    this.events.push({ 'hook': 'onResponseError', 'args': [method, requestId, statusCode, durationMs] });
  }

  protected override onRequestError(error: Error, method: string, requestId: string, url: string, durationMs: number): void {
    this.events.push({ 'hook': 'onRequestError', 'args': [error, method, requestId, url, durationMs] });
  }

  protected override onTimeout(method: string, requestId: string, url: string, timeoutMs: number): void {
    this.events.push({ 'hook': 'onTimeout', 'args': [method, requestId, url, timeoutMs] });
  }

  protected override onAbort(method: string, requestId: string, url: string): void {
    this.events.push({ 'hook': 'onAbort', 'args': [method, requestId, url] });
  }

  protected override onDispatcherDestroy(): void {
    this.events.push({ 'hook': 'onDispatcherDestroy', 'args': [] });
  }

  eventsOf(hook: string): HookEvent[] {
    return this.events.filter((e) => { return e.hook === hook; });
  }
}

void beforeEach(() => {
  globalThis.fetch = fakeFetch;
});

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

function toPlainHeaders(headers: RequestInit['headers']): Record<string, string> {
  const normalized = new Headers(headers);
  const result: Record<string, string> = {};

  for (const [key, value] of normalized.entries()) {
    result[key] = value;
  }

  return result;
}

function parseUrl(input: Request | URL | string): URL {
  return new URL(String(input));
}

function getBodyFor(path: string, headers: RequestInit['headers']): Response {
  if (path === '/echo-headers') {
    return new Response(JSON.stringify({ 'headers': toPlainHeaders(headers) }), {
      'headers': { 'Content-Type': 'application/json' },
      'status': 200
    });
  }

  if (path === '/ok') {
    return new Response(JSON.stringify({ 'value': 'original' }), {
      'headers': { 'Content-Type': 'application/json' },
      'status': 200
    });
  }

  if (path === '/error-body') {
    return new Response('body timeout', {
      'headers': { 'Content-Type': 'text/plain' },
      'status': 200
    });
  }

  if (path === '/error-headers') {
    return new Response('headers timeout', {
      'headers': { 'Content-Type': 'text/plain' },
      'status': 200
    });
  }

  if (path === '/error-socket') {
    return new Response('socket error', {
      'headers': { 'Content-Type': 'text/plain' },
      'status': 200
    });
  }

  return new Response('', { 'status': 404 });
}

async function fakeFetch(input: Request | URL | string, init?: RequestInit): Promise<Response> {
  const parsedUrl = parseUrl(input);
  const signal = init?.signal;

  if (signal?.aborted === true) {
    throw abortError();
  }

  if (parsedUrl.pathname === '/delay') {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, 200);

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

    return new Response(JSON.stringify({ 'status': 'delayed' }), {
      'headers': { 'Content-Type': 'application/json' },
      'status': 200
    });
  }

  if (parsedUrl.pathname === '/error-connect') {
    const error = new Error('connect timeout') as Error & { code?: string };
    error.code = 'UND_ERR_CONNECT_TIMEOUT';
    throw error;
  }

  if (parsedUrl.pathname === '/error-body-timeout') {
    const error = new Error('body timeout') as Error & { code?: string };
    error.code = 'UND_ERR_BODY_TIMEOUT';
    throw error;
  }

  if (parsedUrl.pathname === '/error-headers-timeout') {
    const error = new Error('headers timeout') as Error & { code?: string };
    error.code = 'UND_ERR_HEADERS_TIMEOUT';
    throw error;
  }

  if (parsedUrl.pathname === '/error-socket-timeout') {
    const error = new Error('socket error') as Error & { code?: string };
    error.code = 'UND_ERR_SOCKET';
    throw error;
  }

  if (parsedUrl.pathname === '/error-unknown-code') {
    const error = new Error('unknown error') as Error & { code?: string };
    error.code = 'UND_ERR_SOMETHING_ELSE';
    throw error;
  }

  if (parsedUrl.pathname === '/throw-string') {
    throw 'fetch-string-error';
  }

  return getBodyFor(parsedUrl.pathname, init?.headers);
}

function createHookedClient(): HookedClient {
  return HookedClient.create({ 'baseURL': baseURL });
}

function createDispatcherClient(): HookedClient {
  return HookedClient.create({
    'baseURL': baseURL,
    'dispatcher': {
      'connections': 2,
      'enabled': true
    }
  });
}

function getDispatcher(client: FetchClient): { destroy(options?: unknown): Promise<void> } | undefined {
  return Reflect.get(client, 'dispatcher') as { destroy(options?: unknown): Promise<void> } | undefined;
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const runnerMap: Record<ScenarioCase['operation'], (caseData: ScenarioCase) => Promise<void>> = {
    'abort-event': async (caseData) => {
      const client = createHookedClient();
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort();
      }, caseData.input.abortAfterMs);

      try {
        await client.get(caseData.input.path, { 'signal': controller.signal });
      } catch {
        // expected
      } finally {
        await client.destroy();
      }

      const aborts = client.eventsOf('onAbort');
      assert.equal(aborts.length, caseData.expected.count ?? 1);
      const [method, , url] = aborts[0]!.args as [string, string, string];
      assert.equal(method, caseData.input.method);
      assert.ok(url.includes(caseData.input.path));
      assert.equal(client.eventsOf('onRequestError').length, 1);
    },
    'abort-event-preaborted': async (caseData) => {
      const client = createHookedClient();
      const controller = new AbortController();
      controller.abort();

      try {
        await client.get(caseData.input.path, { signal: controller.signal });
      } catch {
        // expected
      } finally {
        await client.destroy();
      }

      const aborts = client.eventsOf('onAbort');
      assert.equal(aborts.length, caseData.expected.count ?? 1);
      const [method, , url] = aborts[0]!.args as [string, string, string];
      assert.equal(method, caseData.input.method);
      assert.ok(url.includes(caseData.input.path));
      assert.equal(client.eventsOf('onRequestError').length, 1);
    },
    'dispatcher-destroy': async (caseData) => {
      const client = createDispatcherClient();
      await client.destroy();
      assert.equal(client.eventsOf('onDispatcherDestroy').length, caseData.expected.count);
    },
    'dispatcher-destroy-with-timeout': async (caseData) => {
      const client = createDispatcherClient();
      await client.destroy({ 'timeout': caseData.input.timeoutMs });
      assert.equal(client.eventsOf('onDispatcherDestroy').length, caseData.expected.count);
    },
    'dispatcher-destroy-no-dispatcher': async (caseData) => {
      const client = createHookedClient();
      await client.destroy();
      assert.equal(client.eventsOf('onDispatcherDestroy').length, caseData.expected.count);
    },
    'fast-hook': async (caseData) => {
      class SlowButFastEnoughClient extends FetchClient {
        readonly events: string[] = [];

        // Settles across a handful of microtask hops rather than a real timer:
        // HookInvoker races this against a real setTimeout(hookTimeoutMs), and
        // Node always drains the microtask queue before running any timer, so
        // this deterministically wins the race regardless of system load.
        protected override async onRequestStart(): Promise<void> {
          for (let tick = 0; tick < caseData.input.settleMs; tick += 1) {
            await Promise.resolve();
          }
          this.events.push('onRequestStart');
        }
      }

      const client = SlowButFastEnoughClient.create({
        'baseURL': baseURL,
        'hookTimeoutMs': caseData.input.hookTimeoutMs
      });

      try {
        const response = await client.get(caseData.input.path);
        await response.arrayBuffer();
        assert.equal(response.status, 200);
        assert.deepEqual(client.events, caseData.expected.events);
      } finally {
        await client.destroy();
      }
    },
    'hook-timeout': async (caseData) => {
      class NeverSettlesClient extends FetchClient {
        protected override onRequestStart(): Promise<void> {
          return new Promise(() => {
            // Deliberately never resolves or rejects.
          });
        }
      }

      const client = NeverSettlesClient.create({
        'baseURL': baseURL,
        'hookTimeoutMs': caseData.input.hookTimeoutMs
      });

      try {
        await assert.rejects(
          () => client.get(caseData.input.path),
          (error) => {
            assert.ok(error instanceof HookInvocationError);
            assert.equal(error.hookName, caseData.expected.hookName);
            assert.ok(error.cause instanceof HookTimeoutError);
            assert.equal(error.cause.hookName, caseData.expected.hookName);
            assert.equal(error.cause.timeoutMs, caseData.expected.timeoutMs);
            return true;
          }
        );
      } finally {
        await client.destroy();
      }
    },
    'never-settles': async (caseData) => {
      class SlowUnboundedClient extends FetchClient {
        readonly events: string[] = [];

        protected override async onRequestStart(): Promise<void> {
          await new Promise((resolve) => { setTimeout(resolve, caseData.input.settleMs); });
          this.events.push('onRequestStart');
        }
      }

      const client = SlowUnboundedClient.create({ 'baseURL': baseURL });

      try {
        const response = await client.get(caseData.input.path);
        await response.arrayBuffer();
        assert.equal(response.status, 200);
        assert.deepEqual(client.events, caseData.expected.events);
      } finally {
        await client.destroy();
      }
    },
    'request-start': async (caseData) => {
      const client = createHookedClient();
      try {
        const response = await client.get(caseData.input.path);
        await response.arrayBuffer();
        const events = client.eventsOf('onRequestStart');
        assert.equal(events.length, caseData.expected.count);
        const [method, path, requestId, url] = events[0]!.args as [string, string, string, string];
        assert.equal(method, caseData.input.method);
        assert.equal(path, caseData.input.path);
        assert.ok(requestId.length > 0);
        assert.ok(url.includes(caseData.input.path));
      } finally {
        await client.destroy();
      }
    },
    'throw-request-start': async (caseData) => {
      class ThrowingStartClient extends FetchClient {
        protected override onRequestStart(): void {
          throw new Error(caseData.input.message);
        }
      }

      const client = ThrowingStartClient.create({ 'baseURL': baseURL });

      try {
        await assert.rejects(
          () => client.get(caseData.input.path),
          (error) => {
            assert.ok(error instanceof HookInvocationError);
            assert.equal(error.hookName, caseData.expected.hookName);
            assert.ok(error.cause instanceof Error && error.cause.message === caseData.input.message);
            return true;
          }
        );
      } finally {
        await client.destroy();
      }
    },
    'throw-request-error': async (caseData) => {
      class ThrowingRequestErrorClient extends FetchClient {
        protected override onRequestError(): void {
          throw new Error(caseData.input.message);
        }
      }

      const client = ThrowingRequestErrorClient.create({
        'baseURL': baseURL,
        'timeout': caseData.input.timeoutMs
      });

      try {
        await assert.rejects(
          () => client.get(caseData.input.path),
          (error) => {
            assert.ok(error instanceof HookInvocationError);
            assert.equal(error.hookName, caseData.expected.hookName);
            return true;
          }
        );
      } finally {
        await client.destroy();
      }
    },
    'throw-request-error-string': async (caseData) => {
      class ThrowingRequestErrorStringClient extends FetchClient {
        protected override onRequestError(): void {
          throw new Error(caseData.input.message);
        }
      }

      const client = ThrowingRequestErrorStringClient.create({ 'baseURL': baseURL });

      try {
        await assert.rejects(
          () => client.get(caseData.input.path),
          (error) => {
            assert.ok(error instanceof HookInvocationError);
            assert.equal(error.hookName, caseData.expected.hookName);
            return true;
          }
        );
      } finally {
        await client.destroy();
      }
    },
    'throw-response-success': async (caseData) => {
      class ThrowingSuccessClient extends FetchClient {
        protected override onResponseSuccess(): void {
          throw new Error(caseData.input.message);
        }
      }

      const client = ThrowingSuccessClient.create({ 'baseURL': baseURL });

      try {
        await assert.rejects(
          () => client.get(caseData.input.path),
          (error) => {
            assert.ok(error instanceof HookInvocationError);
            assert.equal(error.hookName, caseData.expected.hookName);
            return true;
          }
        );
      } finally {
        await client.destroy();
      }
    },
    'response-error': async (caseData) => {
      const client = createHookedClient();
      try {
        const response = await client.get(caseData.input.path);
        await response.arrayBuffer();
        const successes = client.eventsOf('onResponseSuccess');
        const errors = client.eventsOf('onResponseError');
        assert.equal(errors.length, caseData.expected.count);
        assert.equal(successes.length, 0);
        const [, , statusCode] = errors[0]!.args as [string, string, number, number];
        assert.equal(statusCode, caseData.expected.status);
      } finally {
        await client.destroy();
      }
    },
    'throw-fetch-string': async (caseData) => {
      const client = createHookedClient();

      try {
        await assert.rejects(
          () => client.get(caseData.input.path),
          (error) => {
            assert.strictEqual(error, caseData.expected.message);
            assert.equal(client.eventsOf('onRequestError').length, 1);
            return true;
          }
        );
      } finally {
        await client.destroy();
      }
    },
    'throw-fetch-error': async (caseData) => {
      const client = createHookedClient();
      const originalFetchImpl = globalThis.fetch;

      try {
        globalThis.fetch = async (): Promise<Response> => {
          throw new Error(caseData.input.message);
        };

        await assert.rejects(
          () => client.get(caseData.input.path),
          (error) => {
            assert.ok(error instanceof Error);
            assert.equal((error as Error).message, caseData.input.message);
            assert.equal(client.eventsOf('onRequestError').length, 1);
            return true;
          }
        );
      } finally {
        globalThis.fetch = originalFetchImpl;
        await client.destroy();
      }
    },
    'undici-error-wrap': async (caseData) => {
      const client = caseData.input.path === '/error-connect-exhaustion'
        ? createDispatcherClient()
        : createHookedClient();

      try {
        await assert.rejects(
          () => client.get(caseData.input.path),
          (error) => {
            assert.ok(error instanceof Error);
            assert.equal(error.name, caseData.expected.hookName);
            return true;
          }
        );
      } finally {
        await client.destroy().catch(() => undefined);
      }
    },
    'response-success': async (caseData) => {
      const client = createHookedClient();
      try {
        const response = await client.get(caseData.input.path);
        await response.arrayBuffer();
        const successes = client.eventsOf('onResponseSuccess');
        const errors = client.eventsOf('onResponseError');
        assert.equal(successes.length, caseData.expected.count);
        assert.equal(errors.length, 0);
        const [, , statusCode] = successes[0]!.args as [string, string, number, number];
        assert.equal(statusCode, caseData.expected.status);
      } finally {
        await client.destroy();
      }
    },
    'timeout-event': async (caseData) => {
      const client = HookedClient.create({
        'baseURL': baseURL,
        'timeout': caseData.input.timeoutMs
      });

      try {
        await client.get(caseData.input.path);
      } catch {
        // expected
      } finally {
        await client.destroy();
      }

      const timeouts = client.eventsOf('onTimeout');
      assert.equal(timeouts.length, caseData.expected.count);
      const [method, , , timeoutMs] = timeouts[0]!.args as [string, string, string, number];
      assert.equal(method, caseData.input.method);
      assert.equal(timeoutMs, caseData.expected.timeoutMs);
      assert.equal(client.eventsOf('onRequestError').length, 1);
    },
    'throw-timeout': async (caseData) => {
      class ThrowingTimeoutClient extends FetchClient {
        protected override onTimeout(): void {
          throw new Error(caseData.input.message);
        }
      }

      const client = ThrowingTimeoutClient.create({
        'baseURL': baseURL,
        'timeout': caseData.input.timeoutMs
      });

      try {
        await assert.rejects(
          () => client.get(caseData.input.path),
          (error) => {
            assert.ok(error instanceof HookInvocationError);
            assert.equal(error.hookName, caseData.expected.hookName);
            return true;
          }
        );
      } finally {
        await client.destroy();
      }
    },
    'throw-dispatcher-destroy': async (caseData) => {
      class ThrowingDestroyClient extends FetchClient {
        protected override onDispatcherDestroy(): void {
          throw new Error(caseData.input.message);
        }
      }

      const client = ThrowingDestroyClient.create({
        'baseURL': baseURL,
        ...(caseData.input.dispatcher === undefined ? {} : { 'dispatcher': caseData.input.dispatcher })
      });

      try {
        await assert.rejects(
          () => client.destroy(),
          (error) => {
            assert.ok(error instanceof HookInvocationError);
            assert.equal(error.hookName, caseData.expected.hookName);
            return true;
          }
        );
      } finally {
        await getDispatcher(client)?.destroy();
      }
    }
  };

  return runnerMap[scenarioCase.operation](scenarioCase);
}

void describe('FetchClient lifecycle hooks', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
