import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { BodySerializationError, FetchClient } from '../../../src/node/index.js';
import { PlatformCalls } from '../../helpers/PlatformCalls.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import scenarioGroups from './body-serialization.scenarios.json' with { 'type': 'json' };
import { BodySerializationScenarioCaseEntity } from './entities/BodySerializationScenarioCaseEntity.js';

/** Replaces `globalThis.fetch` with an in-memory `/posts` API that echoes the parsed request body. */
class BodySerializationFetch implements Disposable {
  readonly #original: typeof globalThis.fetch;

  private constructor(original: typeof globalThis.fetch) {
    this.#original = original;
  }

  static install(): BodySerializationFetch {
    const installed = new BodySerializationFetch(globalThis.fetch);
    globalThis.fetch = (input, init): Promise<Response> => {
      const answered = BodySerializationFetch.#respond(input, init);
      return answered;
    };
    return installed;
  }

  static #parseJsonBody(body: string): object {
    let parsed: unknown = {};
    if (body !== '') {
      try {
        parsed = JSON.parse(body);
      } catch {
        parsed = {};
      }
    }
    const record = typeof parsed === 'object' && parsed !== null ? parsed : {};
    return record;
  }

  static async #readBodyText(body: RequestInit['body']): Promise<string> {
    if (body === undefined || body === null) {
      return '';
    }
    if (typeof body === 'string') {
      return body;
    }
    if (body instanceof Uint8Array || body instanceof ArrayBuffer) {
      const decoded = PlatformCalls.decodeText(body);
      return decoded;
    }
    if (typeof Blob !== 'undefined' && body instanceof Blob) {
      const text = await body.text();
      return text;
    }
    const fallback = String(body);
    return fallback;
  }

  static async #respond(input: Request | URL | string, init: RequestInit | undefined): Promise<Response> {
    const url = PlatformCalls.parseUrl(String(input));
    const method = init?.method ?? 'GET';
    const bodyText = await BodySerializationFetch.#readBodyText(init?.body);
    const parsedBody = BodySerializationFetch.#parseJsonBody(bodyText);
    const headers = { 'Content-Type': 'application/json' };

    if (method === 'POST' && url.pathname === '/posts') {
      return new Response(PlatformCalls.stringify({ ...parsedBody, 'id': 101 }), { 'headers': headers, 'status': 201 });
    }
    if (method === 'PUT' && url.pathname === '/posts/1') {
      return new Response(PlatformCalls.stringify({ ...parsedBody, 'id': 1 }), { 'headers': headers, 'status': 200 });
    }
    if (method === 'PATCH' && url.pathname === '/posts/1') {
      return new Response(PlatformCalls.stringify({ 'id': 1, 'title': 'Test Post', ...parsedBody }), { 'headers': headers, 'status': 200 });
    }
    return new Response(PlatformCalls.stringify({ 'error': 'Not Found' }), { 'headers': headers, 'status': 404 });
  }

  [Symbol.dispose](): void {
    globalThis.fetch = this.#original;
  }
}

class BodySerializationRunners {
  private static readonly client = FetchClient.create();

  static async 'rejects'(scenarioCase: ScenarioCaseOfType<BodySerializationScenarioCaseEntity.Type, 'rejects', 'operation'>): Promise<void> {
    using _ = BodySerializationFetch.install();
    const { expected } = scenarioCase;
    const caught = await RejectionProbe.capture(async () => {
      await BodySerializationRunners.invokeRequest(scenarioCase.input.request);
    });
    assert.ok(caught instanceof BodySerializationError);
    assert.ok(caught.cause instanceof TypeError);
    assert.strictEqual(caught.name, expected.name);
    for (let index = 0; index < expected.messageIncludes.length; index += 1) {
      assert.ok(caught.message.includes(expected.messageIncludes[index] ?? ''));
    }
  }

  static async 'succeeds'(scenarioCase: ScenarioCaseOfType<BodySerializationScenarioCaseEntity.Type, 'succeeds', 'operation'>): Promise<void> {
    using _ = BodySerializationFetch.install();
    const { expected } = scenarioCase;
    const response = await BodySerializationRunners.invokeRequest(scenarioCase.input.request);
    assert.strictEqual(response.status, expected.status);

    if (expected.json !== undefined) {
      const expectedJson = RuntimeValueMaterializer.materialize(expected.json);
      assert.deepStrictEqual(await response.json(), expectedJson);
    }
  }

  private static async invokeRequest(request: ScenarioCaseOfType<BodySerializationScenarioCaseEntity.Type, 'succeeds', 'operation'>['input']['request']): Promise<Response> {
    const body = request.body === undefined ? undefined : RuntimeValueMaterializer.materialize(request.body);
    const url = `https://example.test${request.path}`;
    const options = body === undefined ? undefined : { 'body': body };

    if (request.method === 'POST') {
      const response = await BodySerializationRunners.client.post(url, options);
      return response;
    }
    if (request.method === 'PUT') {
      const response = await BodySerializationRunners.client.put(url, options);
      return response;
    }
    const response = await BodySerializationRunners.client.patch(url, options);
    return response;
  }
}

ScenarioSuite.registerBy('operation', {
  'entity': BodySerializationScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FetchClient Body Serialization',
  'runners': BodySerializationRunners
});
