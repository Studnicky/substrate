import { HookInvocationError, HookTimeoutError, RuntimeError } from '@studnicky/errors/node';
import { CallerFault } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { FetchClient, RequestFailedError } from '../../../src/node/index.js';
import { PlatformCalls } from '../../helpers/PlatformCalls.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RoutedFakeFetch } from '../../helpers/RoutedFakeFetch.js';
import { LifecycleHooksScenarioCaseEntity } from './entities/LifecycleHooksScenarioCaseEntity.js';
import scenarioGroups from './lifecycle-hooks.scenarios.json' with { 'type': 'json' };

interface HookEventInterface {
  readonly 'argumentList': unknown[];
  readonly 'hook': string;
}

const BASE_URL = 'https://example.test';

class HookedClient extends FetchClient {
  readonly events: HookEventInterface[] = [];

  eventsOf(hook: string): HookEventInterface[] {
    const matching: HookEventInterface[] = [];
    for (let index = 0; index < this.events.length; index += 1) {
      const event = this.events[index];
      if (event?.hook === hook) {
        matching.push(event);
      }
    }
    return matching;
  }

  protected override onRequestStart(method: string, path: string, requestId: string, url: string): void {
    this.events.push({ 'argumentList': [method, path, requestId, url], 'hook': 'onRequestStart' });
  }

  protected override onResponseSuccess(method: string, requestId: string, statusCode: number, durationMs: number): void {
    this.events.push({ 'argumentList': [method, requestId, statusCode, durationMs], 'hook': 'onResponseSuccess' });
  }

  protected override onResponseError(method: string, requestId: string, statusCode: number, durationMs: number): void {
    this.events.push({ 'argumentList': [method, requestId, statusCode, durationMs], 'hook': 'onResponseError' });
  }

  protected override onRequestError(error: Error, method: string, requestId: string, url: string, durationMs: number): void {
    this.events.push({ 'argumentList': [error, method, requestId, url, durationMs], 'hook': 'onRequestError' });
  }

  protected override onTimeout(method: string, requestId: string, url: string, timeoutMs: number): void {
    this.events.push({ 'argumentList': [method, requestId, url, timeoutMs], 'hook': 'onTimeout' });
  }

  protected override onAbort(method: string, requestId: string, url: string): void {
    this.events.push({ 'argumentList': [method, requestId, url], 'hook': 'onAbort' });
  }

  protected override onDispatcherDestroy(): void {
    this.events.push({ 'argumentList': [], 'hook': 'onDispatcherDestroy' });
  }
}

class ThrowingDestroyClient extends FetchClient {
  failureMessage = '';

  protected override onDispatcherDestroy(): void {
    throw RuntimeError.create(this.failureMessage);
  }
}

class ThrowingRequestErrorClient extends FetchClient {
  failureMessage = '';

  protected override onRequestError(): void {
    throw RuntimeError.create(this.failureMessage);
  }
}

class ThrowingStartClient extends FetchClient {
  failureMessage = '';

  protected override onRequestStart(): void {
    throw RuntimeError.create(this.failureMessage);
  }
}

class ThrowingSuccessClient extends FetchClient {
  failureMessage = '';

  protected override onResponseSuccess(): void {
    throw RuntimeError.create(this.failureMessage);
  }
}

class ThrowingTimeoutClient extends FetchClient {
  failureMessage = '';

  protected override onTimeout(): void {
    throw RuntimeError.create(this.failureMessage);
  }
}

/** Replaces `globalThis.fetch` with an in-memory API covering the success, delay, and failure paths the lifecycle hooks observe. */
class LifecycleFakeFetch implements Disposable {
  static readonly #failures = new Map<string, readonly [string, string]>([
    ['/error-body-timeout', ['body timeout', 'UND_ERR_BODY_TIMEOUT']],
    ['/error-connect', ['connect timeout', 'UND_ERR_CONNECT_TIMEOUT']],
    ['/error-headers-timeout', ['headers timeout', 'UND_ERR_HEADERS_TIMEOUT']],
    ['/error-socket-timeout', ['socket error', 'UND_ERR_SOCKET']],
    ['/error-unknown-code', ['unknown error', 'UND_ERR_SOMETHING_ELSE']]
  ]);

  static readonly #textBodies = new Map<string, string>([
    ['/error-body', 'body timeout'],
    ['/error-headers', 'headers timeout'],
    ['/error-socket', 'socket error']
  ]);

  readonly #original: typeof globalThis.fetch;

  private constructor(original: typeof globalThis.fetch) {
    this.#original = original;
  }

  static install(): LifecycleFakeFetch {
    const installed = new LifecycleFakeFetch(globalThis.fetch);
    globalThis.fetch = (input, init): Promise<Response> => {
      const answered = LifecycleFakeFetch.#respond(input, init);
      return answered;
    };
    return installed;
  }

  static #codedError(message: string, code: string): RuntimeError {
    const error = Object.assign(RuntimeError.create(message), { 'code': code });
    return error;
  }

  static #delayed(signal: AbortSignal | null | undefined): Promise<Response> {
    const pending = new Promise<Response>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(new Response(PlatformCalls.stringify({ 'status': 'delayed' }), {
          'headers': { 'Content-Type': 'application/json' },
          'status': 200
        }));
      }, 200);
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        resolve(CallerFault.rejection(AbortSignal.abort().reason));
      }, { 'once': true });
    });
    return pending;
  }

  static #bodyFor(path: string, headers: RequestInit['headers']): Response {
    if (path === '/echo-headers') {
      return new Response(PlatformCalls.stringify({ 'headers': RoutedFakeFetch.plainHeaders(headers) }), {
        'headers': { 'Content-Type': 'application/json' },
        'status': 200
      });
    }
    if (path === '/ok') {
      return new Response(PlatformCalls.stringify({ 'value': 'original' }), {
        'headers': { 'Content-Type': 'application/json' },
        'status': 200
      });
    }
    const text = LifecycleFakeFetch.#textBodies.get(path);
    if (text === undefined) {
      return new Response('', { 'status': 404 });
    }
    return new Response(text, {
      'headers': { 'Content-Type': 'text/plain' },
      'status': 200
    });
  }

  static #respond(input: Request | URL | string, init: RequestInit | undefined): Promise<Response> {
    const { pathname } = PlatformCalls.parseUrl(String(input));
    const signal = init?.signal;

    if (signal?.aborted === true) {
      const aborted = CallerFault.rejection(AbortSignal.abort().reason);
      return aborted;
    }
    if (pathname === '/delay') {
      const delayed = LifecycleFakeFetch.#delayed(signal);
      return delayed;
    }
    if (pathname === '/throw-string') {
      const thrown = CallerFault.rejection('fetch-string-error');
      return thrown;
    }
    const failure = LifecycleFakeFetch.#failures.get(pathname);
    if (failure !== undefined) {
      const failed = CallerFault.rejection(LifecycleFakeFetch.#codedError(failure[0], failure[1]));
      return failed;
    }
    const answered = Promise.resolve(LifecycleFakeFetch.#bodyFor(pathname, init?.headers));
    return answered;
  }

  [Symbol.dispose](): void {
    globalThis.fetch = this.#original;
  }
}

class LifecycleHooksRunners {
  static async 'abort-event'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'abort-event', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL });
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort(RuntimeError.create('the scenario aborts the request'));
    }, scenarioCase.input.abortAfterMs);

    try {
      await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path, { 'signal': controller.signal });
      });
    } finally {
      await client.destroy();
    }

    LifecycleHooksRunners.assertAbort(client, scenarioCase.input.method, scenarioCase.input.path, scenarioCase.expected.count);
  }

  static async 'abort-event-preaborted'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'abort-event-preaborted', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL });
    const controller = new AbortController();
    controller.abort(RuntimeError.create('the scenario aborts the request before it starts'));

    try {
      await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path, { 'signal': controller.signal });
      });
    } finally {
      await client.destroy();
    }

    LifecycleHooksRunners.assertAbort(client, scenarioCase.input.method, scenarioCase.input.path, scenarioCase.expected.count);
  }

  static async 'dispatcher-destroy'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'dispatcher-destroy', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL, 'dispatcher': scenarioCase.input.dispatcher });
    await client.destroy();
    assert.equal(client.eventsOf('onDispatcherDestroy').length, scenarioCase.expected.count);
  }

  static async 'dispatcher-destroy-no-dispatcher'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'dispatcher-destroy-no-dispatcher', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL });
    await client.destroy();
    assert.equal(client.eventsOf('onDispatcherDestroy').length, scenarioCase.expected.count);
  }

  static async 'dispatcher-destroy-with-timeout'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'dispatcher-destroy-with-timeout', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL, 'dispatcher': scenarioCase.input.dispatcher });
    await client.destroy({ 'timeout': scenarioCase.input.timeoutMs });
    assert.equal(client.eventsOf('onDispatcherDestroy').length, scenarioCase.expected.count);
  }

  static async 'fast-hook'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'fast-hook', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = FetchClient.create({
      'baseURL': BASE_URL,
      'hookTimeoutMs': scenarioCase.input.hookTimeoutMs
    });
    const events: string[] = [];
    // Settles across a handful of microtask hops rather than a real timer: HookInvoker races this
    // against a real `setTimeout(hookTimeoutMs)`, and Node always drains the microtask queue before
    // running any timer, so this deterministically wins the race regardless of system load.
    Reflect.set(client, 'onRequestStart', async (): Promise<void> => {
      for (let tick = 0; tick < scenarioCase.input.settleMs; tick += 1) {
        await Promise.resolve();
      }
      events.push('onRequestStart');
    });

    try {
      const response = await client.get(scenarioCase.input.path);
      await response.arrayBuffer();
      assert.equal(response.status, 200);
      assert.deepEqual(events, scenarioCase.expected.events);
    } finally {
      await client.destroy();
    }
  }

  static async 'hook-timeout'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'hook-timeout', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = FetchClient.create({
      'baseURL': BASE_URL,
      'hookTimeoutMs': scenarioCase.input.hookTimeoutMs
    });
    Reflect.set(client, 'onRequestStart', (): Promise<void> => {
      return new Promise(() => {
        // Deliberately never resolves or rejects.
      });
    });

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
      assert.ok(caught instanceof HookInvocationError);
      assert.equal(caught.hookName, scenarioCase.expected.hookName);
      const cause: unknown = caught.cause;
      assert.ok(cause instanceof HookTimeoutError);
      assert.equal(cause.hookName, scenarioCase.expected.hookName);
      assert.equal(cause.timeoutMs, scenarioCase.expected.timeoutMs);
    } finally {
      await client.destroy();
    }
  }

  static async 'never-settles'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'never-settles', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = FetchClient.create({ 'baseURL': BASE_URL });
    const events: string[] = [];
    Reflect.set(client, 'onRequestStart', async (): Promise<void> => {
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.settleMs); });
      events.push('onRequestStart');
    });

    try {
      const response = await client.get(scenarioCase.input.path);
      await response.arrayBuffer();
      assert.equal(response.status, 200);
      assert.deepEqual(events, scenarioCase.expected.events);
    } finally {
      await client.destroy();
    }
  }

  static async 'request-start'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'request-start', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL });
    try {
      const response = await client.get(scenarioCase.input.path);
      await response.arrayBuffer();
      const events = client.eventsOf('onRequestStart');
      assert.equal(events.length, scenarioCase.expected.count);
      const argumentList = LifecycleHooksRunners.firstEvent(events).argumentList;
      const method = ScenarioValues.requireString(argumentList[0], 'onRequestStart method');
      const path = ScenarioValues.requireString(argumentList[1], 'onRequestStart path');
      const requestId = ScenarioValues.requireString(argumentList[2], 'onRequestStart requestId');
      const url = ScenarioValues.requireString(argumentList[3], 'onRequestStart url');
      assert.equal(method, scenarioCase.input.method);
      assert.equal(path, scenarioCase.input.path);
      assert.ok(requestId.length > 0);
      assert.ok(url.includes(scenarioCase.input.path));
    } finally {
      await client.destroy();
    }
  }

  static async 'response-error'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'response-error', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL });
    try {
      const response = await client.get(scenarioCase.input.path);
      await response.arrayBuffer();
      const successes = client.eventsOf('onResponseSuccess');
      const errors = client.eventsOf('onResponseError');
      assert.equal(errors.length, scenarioCase.expected.count);
      assert.equal(successes.length, 0);
      const statusCode = ScenarioValues.requireNumber(LifecycleHooksRunners.firstEvent(errors).argumentList[2], 'onResponseError statusCode');
      assert.equal(statusCode, scenarioCase.expected.status);
    } finally {
      await client.destroy();
    }
  }

  static async 'response-success'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'response-success', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL });
    try {
      const response = await client.get(scenarioCase.input.path);
      await response.arrayBuffer();
      const successes = client.eventsOf('onResponseSuccess');
      const errors = client.eventsOf('onResponseError');
      assert.equal(successes.length, scenarioCase.expected.count);
      assert.equal(errors.length, 0);
      const statusCode = ScenarioValues.requireNumber(LifecycleHooksRunners.firstEvent(successes).argumentList[2], 'onResponseSuccess statusCode');
      assert.equal(statusCode, scenarioCase.expected.status);
    } finally {
      await client.destroy();
    }
  }

  static async 'throw-dispatcher-destroy'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'throw-dispatcher-destroy', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = ThrowingDestroyClient.create({ 'baseURL': BASE_URL, 'dispatcher': scenarioCase.input.dispatcher });
    client.failureMessage = scenarioCase.input.message;

    const caught = await RejectionProbe.capture(async () => {
      await client.destroy();
    });
    assert.ok(caught instanceof HookInvocationError);
    assert.equal(caught.hookName, scenarioCase.expected.hookName);
    await LifecycleHooksRunners.destroyDispatcher(client);
  }

  static async 'throw-fetch-error'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'throw-fetch-error', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL });
    globalThis.fetch = (): Promise<Response> => {
      const failed = CallerFault.rejection(RuntimeError.create(scenarioCase.input.message));
      return failed;
    };

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
      assert.ok(caught instanceof Error);
      assert.equal(caught.message, scenarioCase.input.message);
      assert.equal(client.eventsOf('onRequestError').length, 1);
    } finally {
      await client.destroy();
    }
  }

  static async 'throw-fetch-string'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'throw-fetch-string', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({ 'baseURL': BASE_URL });

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
      assert.ok(caught instanceof RequestFailedError);
      assert.strictEqual(caught.cause, scenarioCase.expected.message);
      assert.equal(client.eventsOf('onRequestError').length, 1);
    } finally {
      await client.destroy();
    }
  }

  static async 'throw-request-error'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'throw-request-error', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = ThrowingRequestErrorClient.create({
      'baseURL': BASE_URL,
      'timeout': scenarioCase.input.timeoutMs
    });
    client.failureMessage = scenarioCase.input.message;

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
      assert.ok(caught instanceof HookInvocationError);
      assert.equal(caught.hookName, scenarioCase.expected.hookName);
    } finally {
      await client.destroy();
    }
  }

  static async 'throw-request-error-string'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'throw-request-error-string', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = ThrowingRequestErrorClient.create({ 'baseURL': BASE_URL });
    client.failureMessage = scenarioCase.input.message;

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
      assert.ok(caught instanceof HookInvocationError);
      assert.equal(caught.hookName, scenarioCase.expected.hookName);
    } finally {
      await client.destroy();
    }
  }

  static async 'throw-request-start'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'throw-request-start', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = ThrowingStartClient.create({ 'baseURL': BASE_URL });
    client.failureMessage = scenarioCase.input.message;

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
      assert.ok(caught instanceof HookInvocationError);
      assert.equal(caught.hookName, scenarioCase.expected.hookName);
      const cause: unknown = caught.cause;
      assert.ok(cause instanceof Error && cause.message === scenarioCase.input.message);
    } finally {
      await client.destroy();
    }
  }

  static async 'throw-response-success'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'throw-response-success', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = ThrowingSuccessClient.create({ 'baseURL': BASE_URL });
    client.failureMessage = scenarioCase.input.message;

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
      assert.ok(caught instanceof HookInvocationError);
      assert.equal(caught.hookName, scenarioCase.expected.hookName);
    } finally {
      await client.destroy();
    }
  }

  static async 'throw-timeout'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'throw-timeout', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = ThrowingTimeoutClient.create({
      'baseURL': BASE_URL,
      'timeout': scenarioCase.input.timeoutMs
    });
    client.failureMessage = scenarioCase.input.message;

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
      assert.ok(caught instanceof HookInvocationError);
      assert.equal(caught.hookName, scenarioCase.expected.hookName);
    } finally {
      await client.destroy();
    }
  }

  static async 'timeout-event'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'timeout-event', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = HookedClient.create({
      'baseURL': BASE_URL,
      'timeout': scenarioCase.input.timeoutMs
    });

    try {
      await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
    } finally {
      await client.destroy();
    }

    const timeouts = client.eventsOf('onTimeout');
    assert.equal(timeouts.length, scenarioCase.expected.count);
    const { argumentList } = LifecycleHooksRunners.firstEvent(timeouts);
    const method = ScenarioValues.requireString(argumentList[0], 'onTimeout method');
    const timeoutMs = ScenarioValues.requireNumber(argumentList[3], 'onTimeout timeoutMs');
    assert.equal(method, scenarioCase.input.method);
    assert.equal(timeoutMs, scenarioCase.expected.timeoutMs);
    assert.equal(client.eventsOf('onRequestError').length, 1);
  }

  static async 'undici-error-wrap'(scenarioCase: ScenarioCaseOfType<LifecycleHooksScenarioCaseEntity.Type, 'undici-error-wrap', 'operation'>): Promise<void> {
    using _ = LifecycleFakeFetch.install();
    const client = scenarioCase.input.path === '/error-connect-exhaustion'
      ? HookedClient.create({ 'baseURL': BASE_URL, 'dispatcher': { 'connections': 2, 'enabled': true } })
      : HookedClient.create({ 'baseURL': BASE_URL });

    try {
      const caught = await RejectionProbe.capture(async () => {
        await client.get(scenarioCase.input.path);
      });
      assert.ok(caught instanceof Error);
      assert.equal(caught.name, scenarioCase.expected.hookName);
    } finally {
      await client.destroy().catch(() => { return undefined; });
    }
  }

  private static assertAbort(client: HookedClient, method: string, path: string, count: number): void {
    const aborts = client.eventsOf('onAbort');
    assert.equal(aborts.length, count);
    const { argumentList } = LifecycleHooksRunners.firstEvent(aborts);
    assert.equal(ScenarioValues.requireString(argumentList[0], 'onAbort method'), method);
    assert.ok(ScenarioValues.requireString(argumentList[2], 'onAbort url').includes(path));
    assert.equal(client.eventsOf('onRequestError').length, 1);
  }

  private static async destroyDispatcher(client: FetchClient): Promise<void> {
    const dispatcher: unknown = Reflect.get(client, 'dispatcher');
    const destroy: unknown = typeof dispatcher === 'object' && dispatcher !== null ? Reflect.get(dispatcher, 'destroy') : undefined;
    if (typeof destroy === 'function' && typeof dispatcher === 'object') {
      const pending: unknown = Reflect.apply(destroy, dispatcher, []);
      await pending;
    }
  }

  private static firstEvent(events: readonly HookEventInterface[]): HookEventInterface {
    const event = events[0];
    assert.ok(event !== undefined, 'at least one hook event was recorded');
    return event;
  }
}

ScenarioSuite.registerBy('operation', {
  'entity': LifecycleHooksScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FetchClient lifecycle hooks',
  'runners': LifecycleHooksRunners
});
