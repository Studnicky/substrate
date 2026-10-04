import { RuntimeError } from '@studnicky/errors/node';
import { CallerFault } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { UntypedRequestClientInterface } from '../../helpers/interfaces/UntypedRequestClientInterface.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { QueryParametersEntity } from '../../../src/entities/QueryParametersEntity.js';
import { AbortError, ConnectTimeoutError, FetchClient, TimeoutError } from '../../../src/node/index.js';
import { FetchTestError } from '../../helpers/FetchTestError.js';
import { PlatformCalls } from '../../helpers/PlatformCalls.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import { FetchScenarioCaseEntity } from './entities/FetchScenarioCaseEntity.js';
import scenarioGroups from './fetch.scenarios.json' with { 'type': 'json' };

/** Replaces `globalThis.fetch` with an in-memory network covering the success, delay, and failure paths the fetch wrapper handles. */
class FetchWrapperFakeFetch implements Disposable {
  lastFetchedUrl = '';

  readonly #original: typeof globalThis.fetch;

  private constructor(original: typeof globalThis.fetch) {
    this.#original = original;
  }

  static install(): FetchWrapperFakeFetch {
    const installed = new FetchWrapperFakeFetch(globalThis.fetch);
    globalThis.fetch = (input, init): Promise<Response> => {
      const answered = installed.#respond(input, init);
      return answered;
    };
    return installed;
  }

  static #codedError(message: string, code: string): RuntimeError {
    const error = Object.assign(RuntimeError.create(message), { 'code': code });
    return error;
  }

  static #delayed(delayMs: number, signal: AbortSignal | null | undefined): Promise<Response> {
    const pending = new Promise<Response>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(new Response(`delayed ${String(delayMs)}ms`, {
          'headers': { 'Content-Type': 'text/plain' },
          'status': 200
        }));
      }, delayMs);
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        resolve(CallerFault.rejection(AbortSignal.abort().reason));
      }, { 'once': true });
    });
    return pending;
  }

  static #networkFailure(parsedUrl: URL): Promise<Response> | undefined {
    if (parsedUrl.hostname === 'localhost' && parsedUrl.port === '1') {
      const refused = CallerFault.rejection(RuntimeError.create('fetch failed: ECONNREFUSED 127.0.0.1:1'));
      return refused;
    }
    if (parsedUrl.hostname.includes('definitely-does-not-exist')) {
      const notFound = CallerFault.rejection(RuntimeError.create(`fetch failed: ENOTFOUND ${parsedUrl.hostname}`));
      return notFound;
    }
    return undefined;
  }

  static #text(text: string, status: number): Response {
    const response = new Response(text, {
      'headers': { 'Content-Type': 'text/plain' },
      'status': status
    });
    return response;
  }

  #respond(input: Request | URL | string, init: RequestInit | undefined): Promise<Response> {
    const urlString = String(input);
    this.lastFetchedUrl = urlString;
    const parsedUrl = PlatformCalls.parseUrl(urlString);
    const signal = init?.signal;

    if (signal?.aborted === true) {
      const aborted = CallerFault.rejection(AbortSignal.abort().reason);
      return aborted;
    }
    const networkFailure = FetchWrapperFakeFetch.#networkFailure(parsedUrl);
    if (networkFailure !== undefined) {
      return networkFailure;
    }
    if (parsedUrl.pathname === '/delay') {
      const delayMs = Number.parseInt(parsedUrl.searchParams.get('ms') ?? '100', 10);
      const delayed = FetchWrapperFakeFetch.#delayed(delayMs, signal);
      return delayed;
    }
    if (parsedUrl.pathname === '/error-unknown-code') {
      const unknownCode = CallerFault.rejection(FetchWrapperFakeFetch.#codedError('unknown error', 'UND_ERR_SOMETHING_ELSE'));
      return unknownCode;
    }
    if (parsedUrl.pathname === '/error-connect') {
      const connect = CallerFault.rejection(FetchWrapperFakeFetch.#codedError('connect timeout', 'UND_ERR_CONNECT_TIMEOUT'));
      return connect;
    }
    const answered = Promise.resolve(FetchWrapperFakeFetch.#textFor(parsedUrl.pathname));
    return answered;
  }

  static #textFor(pathname: string): Response {
    if (pathname === '/error') {
      const serverError = FetchWrapperFakeFetch.#text('server error', 500);
      return serverError;
    }
    if (pathname === '/instant') {
      const instant = FetchWrapperFakeFetch.#text('instant response', 200);
      return instant;
    }
    const missing = FetchWrapperFakeFetch.#text('not found', 404);
    return missing;
  }

  [Symbol.dispose](): void {
    globalThis.fetch = this.#original;
  }
}

class FetchRunners {
  private static readonly client = FetchClient.create();

  static declaresNullSignalTest(): void {
    void it('accepts a null native Fetch signal', async () => {
      using _ = FetchWrapperFakeFetch.install();
      const response = await FetchRunners.client.get('https://example.test/instant', { 'signal': null });
      assert.equal(response.status, 200);
    });
  }

  static async 'ok'(scenarioCase: ScenarioCaseOfType<FetchScenarioCaseEntity.Type, 'ok', 'outcome'>): Promise<void> {
    using fake = FetchWrapperFakeFetch.install();
    const { expected } = scenarioCase;
    const response = await FetchRunners.invokeRequest(scenarioCase.input.request);
    assert.strictEqual(response.status, expected.status);
    if (expected.url !== undefined) {
      assert.strictEqual(fake.lastFetchedUrl, expected.url);
    }
    if (expected.text === undefined) {
      await response.arrayBuffer();
    } else {
      assert.strictEqual(await response.text(), expected.text);
    }
  }

  static async 'reject'(scenarioCase: ScenarioCaseOfType<FetchScenarioCaseEntity.Type, 'reject', 'outcome'>): Promise<void> {
    using _ = FetchWrapperFakeFetch.install();
    const { expected } = scenarioCase;
    const caught = await RejectionProbe.capture(async () => {
      await FetchRunners.invokeRequest(scenarioCase.input.request);
    });
    assert.ok(caught instanceof Error);
    FetchRunners.assertErrorKind(caught, expected.error);

    if (expected.timeoutMs !== undefined && caught instanceof TimeoutError) {
      assert.strictEqual(caught.timeoutMs, expected.timeoutMs);
    }

    const fragments = expected.messageIncludes ?? [];
    for (let index = 0; index < fragments.length; index += 1) {
      assert.ok(caught.message.includes(fragments[index] ?? ''));
    }

    if (expected.messagePattern !== undefined) {
      FetchRunners.assertMessagePattern(caught.message, expected.messagePattern);
    }
  }

  private static assertErrorKind(caught: Error, kind: 'AbortError' | 'ConnectTimeoutError' | 'Error' | 'TimeoutError'): void {
    if (kind === 'AbortError') {
      assert.ok(caught instanceof AbortError);
    } else if (kind === 'ConnectTimeoutError') {
      assert.ok(caught instanceof ConnectTimeoutError);
    } else if (kind === 'TimeoutError') {
      assert.ok(caught instanceof TimeoutError);
    } else {
      assert.ok(caught instanceof Error);
    }
  }

  private static assertMessagePattern(message: string, pattern: string): void {
    let matches = false;
    if (pattern === 'EAI_AGAIN|ENOTFOUND|fetch failed') {
      matches = message.includes('EAI_AGAIN') || message.includes('ENOTFOUND') || message.includes('fetch failed');
    } else if (pattern === 'ECONNREFUSED|fetch failed') {
      matches = message.includes('ECONNREFUSED') || message.includes('fetch failed');
    } else if (pattern === 'timeout must be a positive number' || pattern === 'url must be a non-empty string') {
      matches = message.includes(pattern);
    } else {
      throw new FetchTestError(`Unsupported fetch message pattern scenario: ${pattern}`);
    }
    assert.equal(matches, true);
  }

  /**
   * `timeout` stays untyped: the timeout-validation scenarios deliberately materialize non-number values
   * (e.g. the string `"5000"`) to prove FetchClient's own runtime guard (`assertValidRequestTimeout`)
   * rejects them — there is no unknown-accepting public surface to pre-validate through, so the
   * malformed value must reach FetchClient itself.
   */
  private static buildOptions(request: FetchScenarioCaseEntity.Type['input']['request']): object {
    const options = request.options ?? {};
    const timeout = request.timeout === undefined ? undefined : RuntimeValueMaterializer.materialize(request.timeout);
    const optionTimeout = options.timeout === undefined ? undefined : RuntimeValueMaterializer.materialize(options.timeout);
    const requestSignal = FetchRunners.materializeSignal(request.signal);
    const optionSignal = FetchRunners.materializeSignal(options.signal);

    const built = {
      ...(requestSignal === undefined ? {} : { 'signal': requestSignal }),
      ...(timeout === undefined ? {} : { 'timeout': timeout }),
      ...(options.headers === undefined ? {} : { 'headers': options.headers }),
      ...(options.method === undefined ? {} : { 'method': options.method }),
      ...(optionSignal === undefined ? {} : { 'signal': optionSignal }),
      ...(optionTimeout === undefined ? {} : { 'timeout': optionTimeout })
    };
    return built;
  }

  private static createClient(request: FetchScenarioCaseEntity.Type['input']['request']): FetchClient {
    if (request.client === undefined) {
      return FetchRunners.client;
    }

    const parameters = request.client.parameters;
    const created = FetchClient.create({
      ...(request.client.baseURL === undefined ? {} : { 'baseURL': request.client.baseURL }),
      ...(parameters === undefined ? {} : { 'parameters': QueryParametersEntity.intake(RuntimeValueMaterializer.materialize(parameters)) })
    });
    return created;
  }

  private static async invokeRequest(request: FetchScenarioCaseEntity.Type['input']['request']): Promise<Response> {
    const url = request.url ?? `https://example.test${request.path ?? ''}`;
    const activeClient: UntypedRequestClientInterface = FetchRunners.createClient(request);

    if (request.invoke === 'apply-get') {
      const argumentList = request.argumentList ?? [];
      const firstArgument = argumentList[0];
      const target = firstArgument === undefined ? undefined : RuntimeValueMaterializer.materialize(firstArgument);
      const response = argumentList.length > 1 ? await activeClient.get(target, argumentList[1]) : await activeClient.get(target);
      return response;
    }

    const requestTarget = request.client === undefined ? url : (request.url ?? request.path ?? url);
    const response = await activeClient.get(requestTarget, FetchRunners.buildOptions(request));
    return response;
  }

  private static materializeSignal(signal: FetchScenarioCaseEntity.Type['input']['request']['signal']): AbortSignal | undefined {
    if (signal === undefined) {
      return undefined;
    }

    const controller = new AbortController();
    if (signal.shape === 'already-aborted') {
      controller.abort(new FetchTestError('the signal is aborted before the request starts'));
      return controller.signal;
    }

    setTimeout(() => {
      controller.abort(new FetchTestError('the signal aborts while the request is in flight'));
    }, signal.delayMs);
    return controller.signal;
  }
}

ScenarioSuite.registerBy('outcome', {
  'entity': FetchScenarioCaseEntity,
  'extraTests': FetchRunners.declaresNullSignalTest,
  'file': scenarioGroups,
  'name': 'fetch wrapper',
  'runners': FetchRunners
});
