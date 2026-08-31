import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { afterEach, describe, it } from 'node:test';

import { FetchClient } from '../../../src/node/index.js';

import scenarioGroups from './body-serialization.scenarios.json' with { type: 'json' };

type JsonPrimitive = null | boolean | number | string;

type RuntimeValue =
  | JsonPrimitive
  | RuntimeValue[]
  | RuntimeObject
  | RuntimeTag;

type RuntimeObject = { [key: string]: RuntimeValue };

type RuntimeTag =
  | { shape: 'array-buffer'; text: string }
  | { shape: 'bigint'; value: string }
  | { shape: 'buffer'; text: string }
  | { shape: 'circular'; name: string }
  | { shape: 'date'; iso: string }
  | { shape: 'filled-buffer'; fill: string; length: number }
  | { shape: 'function-properties'; data: string }
  | { shape: 'symbol-properties'; name: string }
  | { shape: 'undefined' }
  | { shape: 'uint8-array'; text: string };

type RequestDefinition = {
  body?: RuntimeValue;
  method: 'PATCH' | 'POST' | 'PUT';
  path: string;
};

type RejectExpectation = {
  messageIncludes: readonly string[];
  name: 'TypeError';
};

type SuccessExpectation = {
  json?: RuntimeValue;
  status: number;
};

type ScenarioCase = {
  description: string;
  expected: RejectExpectation | SuccessExpectation;
  input: { request: RequestDefinition };
  name: string;
};

const originalFetch = globalThis.fetch;

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

const ctx = {
  client: FetchClient.create()
};

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return typeof value === 'object' && value !== null && 'shape' in value;
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (isRuntimeTag(value)) {
    if (value.shape === 'undefined') {
      return undefined;
    }

    if (value.shape === 'bigint') {
      return BigInt(value.value);
    }

    if (value.shape === 'buffer') {
      return Buffer.from(value.text, 'utf8');
    }

    if (value.shape === 'array-buffer') {
      return new TextEncoder().encode(value.text).buffer;
    }

    if (value.shape === 'uint8-array') {
      return new TextEncoder().encode(value.text);
    }

    if (value.shape === 'filled-buffer') {
      return Buffer.alloc(value.length, value.fill);
    }

    if (value.shape === 'date') {
      return new Date(value.iso);
    }

    if (value.shape === 'circular') {
      const circular: { name: string; self?: unknown } = { name: value.name };
      circular.self = circular;
      return circular;
    }

    if (value.shape === 'symbol-properties') {
      const symbol = Symbol(value.name);
      return {
        [symbol]: 'symbol value',
        name: value.name
      };
    }

    if (value.shape === 'function-properties') {
      return {
        data: value.data,
        method: () => 'function'
      };
    }

    const exhaustiveCheck: never = value;
    throw RuntimeError.create(`Unknown runtime tag: ${JSON.stringify(exhaustiveCheck)}`);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const materialized: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    materialized[key] = materializeRuntimeValue(entry as RuntimeValue);
  }
  return materialized;
}

function parseJsonBody(body: string): Record<string, unknown> {
  if (body === '') {
    return {};
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function readBodyText(body: RequestInit['body']): Promise<string> {
  if (body === undefined || body === null) {
    return '';
  }

  if (typeof body === 'string') {
    return body;
  }

  if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body);
  }

  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body);
  }

  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return await body.text();
  }

  return String(body);
}

async function bodySerializationFetch(input: Request | URL | string, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  const method = init?.method ?? 'GET';
  const bodyText = await readBodyText(init?.body);
  const parsedBody = parseJsonBody(bodyText);

  if (method === 'POST' && url.pathname === '/posts') {
    return new Response(JSON.stringify({
      ...parsedBody,
      id: 101
    }), { 'headers': { 'Content-Type': 'application/json' }, 'status': 201 });
  }

  if (method === 'PUT' && url.pathname === '/posts/1') {
    return new Response(JSON.stringify({
      ...parsedBody,
      id: 1
    }), { 'headers': { 'Content-Type': 'application/json' }, 'status': 200 });
  }

  if (method === 'PATCH' && url.pathname === '/posts/1') {
    return new Response(JSON.stringify({
      id: 1,
      title: 'Test Post',
      ...parsedBody
    }), { 'headers': { 'Content-Type': 'application/json' }, 'status': 200 });
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    'headers': { 'Content-Type': 'application/json' },
    'status': 404
  });
}

async function invokeRequest(request: RequestDefinition): Promise<Response> {
  const body = request.body === undefined ? undefined : materializeRuntimeValue(request.body);
  const url = `https://example.test${request.path}`;

  if (request.method === 'POST') {
    return ctx.client.post(url, body === undefined ? undefined : { body });
  }

  if (request.method === 'PUT') {
    return ctx.client.put(url, body === undefined ? undefined : { body });
  }

  return ctx.client.patch(url, body === undefined ? undefined : { body });
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const { expected } = scenarioCase;
  if ('messageIncludes' in expected) {
    await assert.rejects(async () => {
      await invokeRequest(scenarioCase.input.request);
    }, (error: Error) => {
      assert.ok(error instanceof TypeError);
      assert.strictEqual(error.name, expected.name);
      for (const expectedMessagePart of expected.messageIncludes) {
        assert.ok(error.message.includes(expectedMessagePart));
      }
      return true;
    });
    return;
  }

  const response = await invokeRequest(scenarioCase.input.request);
  assert.strictEqual(response.status, expected.status);

  if (expected.json !== undefined) {
    const expectedJson = materializeRuntimeValue(expected.json);
    assert.deepStrictEqual(await response.json(), expectedJson);
  }
}

void describe('FetchClient Body Serialization', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      globalThis.fetch = bodySerializationFetch;
      await runCase(scenario);
    });
  }
});
