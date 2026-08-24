import { Guard } from '@studnicky/types';

import type { DestroyOptionsEntity } from '../entities/DestroyOptionsEntity.js';
import type { DispatcherConfigEntity } from '../entities/DispatcherConfigEntity.js';
import type { DispatcherHealthEntity } from '../entities/DispatcherHealthEntity.js';
import type { SocketDispatcherStatsEntity } from '../entities/SocketDispatcherStatsEntity.js';

import {
  HTTP_STATUS_NOT_FOUND, HTTP_STATUS_OK
} from '../constants/index.js';

class OriginState {
  public 'active' = 0;
  public readonly 'queue': QueueEntry[] = [];
  public readonly 'stats': SocketDispatcherStatsEntity.Type;

  public constructor(capacity: number) {
    this.stats = {
      'connected': capacity,
      'free': capacity,
      'pending': 0,
      'queued': 0,
      'running': 0,
      'size': 0
    };
  }
}

class QueueEntry {
  public 'cancelled' = false;
  public readonly 'onAbort': () => void;
  public readonly 'resolve': () => void;

  public constructor(onAbort: () => void, resolve: () => void) {
    this.onAbort = onAbort;
    this.resolve = resolve;
  }
}

class TestRequest {
  public readonly 'body': string;
  public readonly 'headers': Record<string, string>;
  public readonly 'method': string;
  public readonly 'origin': string;
  public readonly 'path': string;
  public readonly 'searchParameters': URL['searchParams'];
  public readonly 'signal': AbortSignal | undefined;
  public readonly 'url': string;

  public constructor(
    body: string,
    headers: Record<string, string>,
    method: string,
    origin: string,
    path: string,
    searchParameters: URL['searchParams'],
    signal: AbortSignal | undefined,
    url: string
  ) {
    this.body = body;
    this.headers = headers;
    this.method = method;
    this.origin = origin;
    this.path = path;
    this.searchParameters = searchParameters;
    this.signal = signal;
    this.url = url;
  }
}

class NetworkFailure extends Error {
  public 'code': string;

  public constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'Error';
  }
}

interface TestDispatcherSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class TestDispatcherInstance {
  static belongsTo<TInstance>(
    constructor: TestDispatcherSubclassInterface<TInstance>,
    value: TInstance | object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

const TEST_TRANSPORT_MARKER = '__substrateFetchTransport';

export class TestDispatcher {
  #capacity: number;
  #destroyed = false;
  #label: string;
  #originStates = new Map<string, OriginState>();
  #substrateFetchTransport = true;

  get [TEST_TRANSPORT_MARKER](): boolean {
    const result = this.#substrateFetchTransport;
    return result;
  }

  static create<TInstance extends TestDispatcher = TestDispatcher>(
    this: TestDispatcherSubclassInterface<TInstance>,
    config: Partial<DispatcherConfigEntity.Type> = {}
  ): TInstance {
    const result = Reflect.construct(this, [config]) as object;
    if (!TestDispatcherInstance.belongsTo(this, result)) {
      throw new TypeError('TestDispatcher.create() did not construct the requested subclass.');
    }
    const instance: TInstance = result;
    return instance;
  }

  static #abortError(): DOMException {
    return new DOMException('The operation was aborted.', 'AbortError');
  }

  static #delay(ms: number, signal: AbortSignal | undefined): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted === true) {
        reject(TestDispatcher.#abortError());
        return;
      }

      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, ms);

      function cleanup(): void {
        clearTimeout(timeout);
        signal?.removeEventListener('abort', onAbort);
      }

      function onAbort(): void {
        cleanup();
        reject(TestDispatcher.#abortError());
      }

      signal?.addEventListener('abort', onAbort, { 'once': true });
    });
  }

  static #parseJsonBody(body: string): Record<string, unknown> {
    if (body === '') {
      return {};
    }

    try {
      const parsed: unknown = JSON.parse(body);
      if (!Guard.isObject(parsed)) {
        return {};
      }
      const result: Record<string, unknown> = {};
      const keys = Object.keys(parsed);
      const keyLength = keys.length;
      for (let index = 0; index < keyLength; index += 1) {
        const key = keys[index];
        if (key === undefined) {
          continue;
        }
        const value: unknown = Reflect.get(parsed, key);
        Reflect.set(result, key, value);
      }
      return result;
    } catch {
      return {};
    }
  }

  static #toPlainHeaders(headers: ConstructorParameters<typeof Headers>[0] | undefined): Record<string, string> {
    if (headers === undefined) {
      return {};
    }

    const normalized = new Headers(headers);
    const result: Record<string, string> = {};

    const entries = Array.from(normalized.entries());
    const entryLength = entries.length;
    for (let index = 0; index < entryLength; index += 1) {
      const entry = entries[index];
      if (entry === undefined) {
        continue;
      }
      const [key, value] = entry;
      Reflect.set(result, key, value);
    }

    return result;
  }

  static #readBodyValue(body: ArrayBuffer | ArrayBufferView | Blob | null | string | undefined): string {
    if (body === undefined || body === null) {
      return '';
    }

    if (typeof body === 'string') {
      return body;
    }

    if (body instanceof Uint8Array) {
      const result = new TextDecoder().decode(body);
      return result;
    }

    if (body instanceof ArrayBuffer) {
      const result = new TextDecoder().decode(new Uint8Array(body));
      return result;
    }

    if (ArrayBuffer.isView(body)) {
      const result = new TextDecoder().decode(new Uint8Array(body.buffer, body.byteOffset, body.byteLength));
      return result;
    }

    if (body instanceof Blob) {
      throw new TypeError('Blob request bodies are not supported in the fetch test dispatcher');
    }

    const result = String(body);
    return result;
  }

  static #jsonResponse(status: number, value: object, headers: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(value), {
      'headers': {
        'Content-Type': 'application/json',
        ...headers
      },
      'status': status
    });
  }

  static #textResponse(status: number, value: string, headers: Record<string, string> = {}): Response {
    return new Response(value, { 'headers': headers, 'status': status });
  }

  static #networkError(code: string, message: string): NetworkFailure {
    return new NetworkFailure(code, message);
  }

  static #log(...parts: readonly unknown[]): void {
    if (process.env.SUBSTRATE_FETCH_TEST_LOG === '1') {
      const entries: string[] = [];
      const partLength = parts.length;
      for (let index = 0; index < partLength; index += 1) {
        const part = parts[index];
        entries.push(String(part));
      }
      process.stderr.write(`[fetch-test-dispatcher] ${entries.join(' ')}\n`);
    }
  }

  static #stateSummary(state: OriginState): SocketDispatcherStatsEntity.Type {
    return {
      'connected': state.stats.connected,
      'free': state.stats.free,
      'pending': state.stats.pending,
      'queued': state.stats.queued,
      'running': state.stats.running,
      'size': state.stats.size
    };
  }

  static #removeQueuedEntry(state: OriginState, entry: QueueEntry): void {
    const index = state.queue.indexOf(entry);
    if (index >= 0) {
      state.queue.splice(index, 1);
    }
  }

  static #syncState(state: OriginState, capacity: number): void {
    state.stats.connected = capacity;
    state.stats.free = Math.max(0, capacity - state.active);
    state.stats.pending = state.active + state.stats.queued;
    state.stats.running = state.active;
    state.stats.size = state.active + state.stats.queued;
  }

  protected constructor(config: Partial<DispatcherConfigEntity.Type>) {
    const connections = config.connections ?? 1;
    const pipelining = config.pipelining ?? 1;
    this.#capacity = Math.max(1, connections * Math.max(1, pipelining));
    this.#label = config.enabled === true ? 'dispatcher' : 'server';
  }

  async close(): Promise<void> {
    await this.#waitForIdle();
  }

  async destroy(options?: DestroyOptionsEntity.Type): Promise<void> {
    const timeout = options?.timeout;
    if (timeout !== undefined && timeout > 0) {
      await TestDispatcher.#delay(timeout, undefined);
    }
    this.#destroyed = true;
    await this.#waitForIdle();
  }

  checkDispatcherHealth(origin: string): DispatcherHealthEntity.Type {
    const stats = this.#originStates.get(origin)?.stats;

    if (stats === undefined || stats.connected <= 0) {
      return { 'healthy': true };
    }

    const queueRatio = stats.connected > 0 ? stats.pending / stats.connected : 0;
    const healthy = queueRatio < 0.5;

    let recommendation: string | undefined;
    if (queueRatio >= 1) {
      recommendation = `Connection pool is overloaded for ${this.#label}. Increase connections from ${stats.connected} to at least ${Math.ceil(stats.connected * 2)} (pending: ${stats.pending}, ratio: ${queueRatio.toFixed(2)})`;
    } else if (queueRatio >= 0.5) {
      recommendation = `Connection pool is under pressure for ${this.#label}. Consider increasing connections from ${stats.connected} to ${Math.ceil(stats.connected * 1.5)} (pending: ${stats.pending}, ratio: ${queueRatio.toFixed(2)})`;
    }

    return {
      'healthy': healthy,
      'queueRatio': queueRatio,
      'stats': stats,
      ...(recommendation !== undefined ? { 'recommendation': recommendation } : {})
    };
  }

  getStats(): Readonly<Record<string, unknown>> {
    const frozen: Record<string, unknown> = {};

    const originStateEntries = Array.from(this.#originStates.entries());
    const originStateEntryLength = originStateEntries.length;
    for (let index = 0; index < originStateEntryLength; index += 1) {
      const entry = originStateEntries[index];
      if (entry === undefined) {
        continue;
      }
      const [origin, state] = entry;
      Reflect.set(frozen, origin, Object.freeze({ ...state.stats }));
    }

    const result = Object.freeze(frozen);
    return result;
  }

  async fetch(url: string, init: Record<string, unknown>): Promise<Response> {
    const request = this.#normalizeRequest(url, init);
    const state = this.#stateFor(request.origin);

    await this.#acquire(state, request.signal);

    try {
      if (request.signal?.aborted === true) {
        throw TestDispatcher.#abortError();
      }
      if (this.#destroyed) {
        throw TestDispatcher.#abortError();
      }

      TestDispatcher.#log('request', request.method, request.url);
      return await this.#performRequest(request);
    } finally {
      this.#release(state);
    }
  }

  #normalizeRequest(url: string, init: Record<string, unknown>): TestRequest {
    const parsedUrl = new URL(url);
    const rawBody = init.body;
    const body = rawBody === null
      || typeof rawBody === 'string'
      || rawBody instanceof ArrayBuffer
      || ArrayBuffer.isView(rawBody)
      || rawBody instanceof Blob
      ? rawBody
      : String(rawBody);
    return new TestRequest(
      TestDispatcher.#readBodyValue(body),
      TestDispatcher.#toPlainHeaders(init.headers as ConstructorParameters<typeof Headers>[0] | undefined),
      typeof init.method === 'string' ? init.method.toUpperCase() : 'GET',
      parsedUrl.origin,
      parsedUrl.pathname,
      parsedUrl.searchParams,
      init.signal instanceof AbortSignal ? init.signal : undefined,
      url
    );
  }

  #stateFor(origin: string): OriginState {
    const existing = this.#originStates.get(origin);

    if (existing !== undefined) {
      return existing;
    }

    const state = new OriginState(this.#capacity);

    this.#originStates.set(origin, state);
    TestDispatcher.#log('origin-create', origin, TestDispatcher.#stateSummary(state));
    return state;
  }

  async #acquire(state: OriginState, signal: AbortSignal | undefined): Promise<void> {
    if (state.active < this.#capacity) {
      state.active += 1;
      TestDispatcher.#syncState(state, this.#capacity);
      TestDispatcher.#log('acquire-granted', TestDispatcher.#stateSummary(state));
      return;
    }

    state.stats.queued += 1;
    TestDispatcher.#syncState(state, this.#capacity);
    TestDispatcher.#log('acquire-queued', TestDispatcher.#stateSummary(state));

    if (signal?.aborted === true) {
      state.stats.queued -= 1;
      TestDispatcher.#syncState(state, this.#capacity);
      TestDispatcher.#log('acquire-aborted-before-wait', TestDispatcher.#stateSummary(state));
      throw TestDispatcher.#abortError();
    }

    await new Promise<void>((resolve, reject) => {
      const capacity = this.#capacity;

      function cleanup(): void {
        signal?.removeEventListener('abort', queuedEntry.onAbort);
      }

      function onAbort(): void {
        if (queuedEntry.cancelled) {
          return;
        }

        queuedEntry.cancelled = true;
        cleanup();
        TestDispatcher.#removeQueuedEntry(state, queuedEntry);
        state.stats.queued -= 1;
        TestDispatcher.#syncState(state, capacity);
        TestDispatcher.#log('acquire-aborted-while-queued', TestDispatcher.#stateSummary(state));
        reject(TestDispatcher.#abortError());
      }

      function resolveQueued(): void {
        if (queuedEntry.cancelled) {
          return;
        }

        queuedEntry.cancelled = true;
        cleanup();
        state.stats.queued -= 1;
        state.active += 1;
        TestDispatcher.#syncState(state, capacity);
        TestDispatcher.#log('acquire-granted-from-queue', TestDispatcher.#stateSummary(state));
        resolve();
      }

      const queuedEntry = new QueueEntry(onAbort, resolveQueued);

      signal?.addEventListener('abort', queuedEntry.onAbort, { 'once': true });

      state.queue.push(queuedEntry);
    });
  }

  #release(state: OriginState): void {
    state.active = Math.max(0, state.active - 1);
    TestDispatcher.#syncState(state, this.#capacity);
    TestDispatcher.#log('release', TestDispatcher.#stateSummary(state));

    let next = state.queue.shift();
    while (next?.cancelled === true) {
      next = state.queue.shift();
    }

    next?.resolve();
  }

  async #waitForIdle(): Promise<void> {
    while (true) {
      let hasActiveRequests = false;
      const summaries: Record<string, unknown>[] = [];

      for (const [origin, state] of this.#originStates.entries()) {
        hasActiveRequests = hasActiveRequests || state.active > 0 || state.queue.length > 0;
        summaries.push({ 'origin': origin, ...TestDispatcher.#stateSummary(state), 'active': state.active });
      }

      if (!hasActiveRequests) {
        TestDispatcher.#log('idle');
        return;
      }

      TestDispatcher.#log('wait-for-idle', summaries);
      await TestDispatcher.#delay(10, undefined);
    }
  }

  async #performRequest(request: TestRequest): Promise<Response> {
    const originUrl = new URL(request.origin);

    if (originUrl.protocol !== 'http:' && originUrl.protocol !== 'https:') {
      throw TestDispatcher.#networkError('ERR_INVALID_PROTOCOL', `unsupported protocol ${originUrl.protocol}`);
    }

    if (
      (
        originUrl.hostname === '127.0.0.1' ||
        originUrl.hostname === 'localhost' ||
        originUrl.hostname === '::1' ||
        originUrl.hostname === '[::1]'
      )
      && originUrl.port !== '41234'
    ) {
      throw TestDispatcher.#networkError('ECONNREFUSED', `connect ECONNREFUSED ${request.origin}`);
    }

    if (originUrl.hostname.includes(':') || originUrl.hostname.startsWith('192.0.2.')) {
      throw TestDispatcher.#networkError('ENETUNREACH', `connect ENETUNREACH ${request.origin}`);
    }

    if (request.origin.includes('does-not-exist') || request.origin.includes('invalid-domain')) {
      throw TestDispatcher.#networkError('ENOTFOUND', `getaddrinfo ENOTFOUND ${request.origin}`);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { 'status': HTTP_STATUS_OK });
    }

    if (request.method === 'GET' && request.path === '/404') {
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_NOT_FOUND, { 'error': 'Not Found' });
      return result;
    }

    if (request.method === 'GET' && request.path === '/echo') {
      const query: Record<string, string> = {};
      const queryEntries = Array.from(request.searchParameters.entries());
      const queryEntryLength = queryEntries.length;
      for (let index = 0; index < queryEntryLength; index += 1) {
        const entry = queryEntries[index];
        if (entry === undefined) {
          continue;
        }
        const [key, value] = entry;
        Reflect.set(query, key, value);
      }
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, { 'query': query });
      return result;
    }

    if (request.method === 'GET' && request.path === '/delay') {
      const delayMs = Number(request.searchParameters.get('ms') ?? '5000');
      await TestDispatcher.#delay(Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 5000, request.signal);
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, {
        'message': `delayed ${Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 5000}ms`
      });
      return result;
    }

    if (request.method === 'GET' && request.path === '/posts') {
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, [
        { 'id': 1, 'title': 'Post 1' },
        { 'id': 2, 'title': 'Post 2' }
      ]);
      return result;
    }

    if (request.method === 'GET' && request.path === '/posts/1') {
      await TestDispatcher.#delay(5, request.signal);
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, {
        'headers': request.headers,
        'id': 1,
        'title': 'Test Post',
        'userId': 1
      });
      return result;
    }

    if (request.method === 'GET' && request.path === '/posts/2') {
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, {
        'headers': request.headers,
        'id': 2,
        'title': 'Test Post 2',
        'userId': 1
      });
      return result;
    }

    if (request.method === 'GET' && request.path === '/posts/3') {
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, {
        'headers': request.headers,
        'id': 3,
        'title': 'Test Post 3',
        'userId': 1
      });
      return result;
    }

    if (request.method === 'HEAD' && request.path === '/posts/1') {
      return new Response(null, {
        'headers': {
          'Content-Length': '100',
          'Content-Type': 'application/json'
        },
        'status': HTTP_STATUS_OK
      });
    }

    if (request.method === 'DELETE' && request.path === '/posts/1') {
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, {});
      return result;
    }

    if (request.method === 'PATCH' && request.path === '/posts/1') {
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, {
        ...TestDispatcher.#parseJsonBody(request.body),
        'id': 1,
        'title': 'Test Post'
      });
      return result;
    }

    if (request.method === 'PUT' && request.path === '/posts/1') {
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, {
        ...TestDispatcher.#parseJsonBody(request.body),
        'id': 1
      });
      return result;
    }

    if (request.method === 'POST' && request.path === '/posts') {
      const result = TestDispatcher.#jsonResponse(201, {
        ...TestDispatcher.#parseJsonBody(request.body),
        'id': 101
      });
      return result;
    }

    if (request.method === 'POST' && request.path === '/echo') {
      const result = TestDispatcher.#jsonResponse(HTTP_STATUS_OK, {
        'body': TestDispatcher.#parseJsonBody(request.body),
        'headers': request.headers
      });
      return result;
    }

    if (request.method === 'GET' && request.path === '/ok') {
      const result = TestDispatcher.#textResponse(HTTP_STATUS_OK, 'ok');
      return result;
    }

    if (request.method === 'GET' && request.path === '/not-found') {
      const result = TestDispatcher.#jsonResponse(404, { 'error': 'Not Found' });
      return result;
    }

    const result = TestDispatcher.#jsonResponse(HTTP_STATUS_NOT_FOUND, { 'error': 'Not Found' });
    return result;
  }
}
