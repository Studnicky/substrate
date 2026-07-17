import type { Server } from 'node:http';

import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  after, before, describe, it
} from 'node:test';

import { HookInvocationError, HookTimeoutError } from '@studnicky/errors';

import { FetchClient } from '../../../src/index.js';

type HookEvent = { 'hook': string; 'args': unknown[] };

class HookedClient extends FetchClient {
  static override create(config: Parameters<typeof FetchClient.create>[0] = {}): HookedClient {
    return new this(config);
  }

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

  protected override onRequestError(error: unknown, method: string, requestId: string, url: string, durationMs: number): void {
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

let server: Server;
let baseURL: string;

void before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/ok') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 'status': 'ok' }));
      return;
    }

    if (url.pathname === '/not-found') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 'error': 'not found' }));
      return;
    }

    if (url.pathname === '/delay') {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 'status': 'delayed' }));
      }, 200);
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();

      if (addr !== null && typeof addr === 'object') {
        baseURL = `http://127.0.0.1:${addr.port}`;
        resolve();
      }
    });
  });
});

void after(() => {
  server.close();
});

void describe('FetchClient lifecycle hooks', () => {
  void it('onRequestStart fires with correct method, path, requestId, url', async () => {
    const client = HookedClient.create({ 'baseURL': baseURL });
    await client.get('/ok');

    const starts = client.eventsOf('onRequestStart');

    assert.equal(starts.length, 1);
    const [method, path, requestId, url] = starts[0]!.args as [string, string, string, string];

    assert.equal(method, 'GET');
    assert.equal(path, '/ok');
    assert.ok(typeof requestId === 'string' && requestId.length > 0, 'requestId must be non-empty');
    assert.ok(url.includes('/ok'), `url should include /ok, got: ${url}`);
  });

  void it('onResponseSuccess fires on 200 OK', async () => {
    const client = HookedClient.create({ 'baseURL': baseURL });
    await client.get('/ok');

    const successes = client.eventsOf('onResponseSuccess');
    const errors = client.eventsOf('onResponseError');

    assert.equal(successes.length, 1);
    assert.equal(errors.length, 0);
    const [, , statusCode] = successes[0]!.args as [string, string, number, number];

    assert.equal(statusCode, 200);
  });

  void it('onResponseError fires on 404 and onResponseSuccess does not', async () => {
    const client = HookedClient.create({ 'baseURL': baseURL });
    await client.get('/not-found');

    const successes = client.eventsOf('onResponseSuccess');
    const errors = client.eventsOf('onResponseError');

    assert.equal(errors.length, 1);
    assert.equal(successes.length, 0);
    const [, , statusCode] = errors[0]!.args as [string, string, number, number];

    assert.equal(statusCode, 404);
  });

  void it('onTimeout fires when request times out', async () => {
    const client = HookedClient.create({ 'baseURL': baseURL, 'timeout': 1 });

    try {
      await client.get('/delay');
    } catch {
      // expected
    }

    const timeouts = client.eventsOf('onTimeout');

    assert.equal(timeouts.length, 1);
    const [method, , , timeoutMs] = timeouts[0]!.args as [string, string, string, number];

    assert.equal(method, 'GET');
    assert.equal(timeoutMs, 1);

    // onRequestError should also fire for timeout
    const requestErrors = client.eventsOf('onRequestError');

    assert.equal(requestErrors.length, 1);
  });

  void it('onAbort fires when AbortController aborts', async () => {
    const client = HookedClient.create({ 'baseURL': baseURL });
    const controller = new AbortController();

    setTimeout(() => {
      return controller.abort();
    }, 10);

    try {
      await client.get('/delay', { 'signal': controller.signal });
    } catch {
      // expected
    }

    const aborts = client.eventsOf('onAbort');

    assert.equal(aborts.length, 1);
    const [method, , url] = aborts[0]!.args as [string, string, string];

    assert.equal(method, 'GET');
    assert.ok(url.includes('/delay'), `url should include /delay, got: ${url}`);

    // onRequestError should also fire for abort
    const requestErrors = client.eventsOf('onRequestError');

    assert.equal(requestErrors.length, 1);
  });

  void it('onDispatcherDestroy fires on client.destroy() when dispatcher configured', async () => {
    const client = HookedClient.create({
      'baseURL': baseURL,
      'dispatcher': { 'connections': 2, 'enabled': true }
    });

    await client.destroy();

    const destroys = client.eventsOf('onDispatcherDestroy');

    assert.equal(destroys.length, 1);
  });

  void it('a throwing onRequestStart hook surfaces as a HookInvocationError and aborts the request', async () => {
    class ThrowingStartClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): ThrowingStartClient {
        return new this(config);
      }

      protected override onRequestStart(): void {
        throw new Error('onRequestStart boom');
      }
    }

    const client = ThrowingStartClient.create({ 'baseURL': baseURL });

    await assert.rejects(
      () => client.get('/ok'),
      (error: unknown) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, 'onRequestStart');
        assert.ok(error.cause instanceof Error && error.cause.message === 'onRequestStart boom');
        return true;
      }
    );
  });

  void it('a throwing onResponseSuccess hook surfaces as a HookInvocationError instead of the successful response', async () => {
    class ThrowingSuccessClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): ThrowingSuccessClient {
        return new this(config);
      }

      protected override onResponseSuccess(): void {
        throw new Error('onResponseSuccess boom');
      }
    }

    const client = ThrowingSuccessClient.create({ 'baseURL': baseURL });

    await assert.rejects(
      () => client.get('/ok'),
      (error: unknown) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, 'onResponseSuccess');
        return true;
      }
    );
  });

  void it('a throwing onTimeout hook surfaces as a HookInvocationError caused by the timeout error', async () => {
    class ThrowingTimeoutClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): ThrowingTimeoutClient {
        return new this(config);
      }

      protected override onTimeout(): void {
        throw new Error('onTimeout boom');
      }
    }

    const client = ThrowingTimeoutClient.create({ 'baseURL': baseURL, 'timeout': 1 });

    await assert.rejects(
      () => client.get('/delay'),
      (error: unknown) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, 'onTimeout');
        return true;
      }
    );
  });

  void it('a throwing onRequestError hook surfaces as a HookInvocationError', async () => {
    class ThrowingRequestErrorClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): ThrowingRequestErrorClient {
        return new this(config);
      }

      protected override onRequestError(): void {
        throw new Error('onRequestError boom');
      }
    }

    const client = ThrowingRequestErrorClient.create({ 'baseURL': baseURL, 'timeout': 1 });

    await assert.rejects(
      () => client.get('/delay'),
      (error: unknown) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, 'onRequestError');
        return true;
      }
    );
  });

  void it('a throwing onDispatcherDestroy hook surfaces as a HookInvocationError and skips dispatcher shutdown', async () => {
    class ThrowingDestroyClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): ThrowingDestroyClient {
        return new this(config);
      }

      protected override onDispatcherDestroy(): void {
        throw new Error('onDispatcherDestroy boom');
      }
    }

    const client = ThrowingDestroyClient.create({
      'baseURL': baseURL,
      'dispatcher': { 'connections': 2, 'enabled': true }
    });

    await assert.rejects(
      () => client.destroy(),
      (error: unknown) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, 'onDispatcherDestroy');
        return true;
      }
    );
  });
});

void describe('FetchClient hookTimeoutMs', () => {
  void it('a hook that resolves before hookTimeoutMs behaves identically to today', async () => {
    class SlowButFastEnoughClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): SlowButFastEnoughClient {
        return new this(config);
      }

      readonly events: string[] = [];

      protected override async onRequestStart(): Promise<void> {
        await new Promise((resolve) => { setTimeout(resolve, 5); });
        this.events.push('onRequestStart');
      }
    }

    const client = SlowButFastEnoughClient.create({ 'baseURL': baseURL, 'hookTimeoutMs': 50 });
    const response = await client.get('/ok');

    assert.equal(response.status, 200);
    assert.deepEqual(client.events, ['onRequestStart']);
  });

  void it('a hook that never settles fails the request with a HookInvocationError whose cause is a HookTimeoutError, once hookTimeoutMs is configured', async () => {
    class NeverSettlesClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): NeverSettlesClient {
        return new this(config);
      }

      protected override onRequestStart(): Promise<void> {
        return new Promise(() => {
          // Deliberately never resolves or rejects.
        });
      }
    }

    const client = NeverSettlesClient.create({ 'baseURL': baseURL, 'hookTimeoutMs': 20 });

    await assert.rejects(
      () => client.get('/ok'),
      (error: unknown) => {
        assert.ok(error instanceof HookInvocationError);
        assert.equal(error.hookName, 'onRequestStart');
        assert.ok(error.cause instanceof HookTimeoutError);
        assert.equal(error.cause.hookName, 'onRequestStart');
        assert.equal(error.cause.timeoutMs, 20);
        return true;
      }
    );
  });

  void it('with hookTimeoutMs unset, a slow-settling hook still succeeds, unchanged from today', async () => {
    class SlowUnboundedClient extends FetchClient {
      static override create(config: Parameters<typeof FetchClient.create>[0] = {}): SlowUnboundedClient {
        return new this(config);
      }

      readonly events: string[] = [];

      protected override async onRequestStart(): Promise<void> {
        await new Promise((resolve) => { setTimeout(resolve, 40); });
        this.events.push('onRequestStart');
      }
    }

    const client = SlowUnboundedClient.create({ 'baseURL': baseURL });
    const response = await client.get('/ok');

    assert.equal(response.status, 200);
    assert.deepEqual(client.events, ['onRequestStart']);
  });
});
