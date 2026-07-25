import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { afterEach, describe, it } from 'node:test';

import { FetchClient } from '../../../src/index.js';

import scenarioGroups from './body-serialization.scenarios.json';

type JsonPrimitive = null | boolean | number | string;

type RuntimeValue =
  | JsonPrimitive
  | RuntimeValue[]
  | RuntimeObject
  | RuntimeTag;

type RuntimeObject = { [key: string]: RuntimeValue };

type RuntimeTag =
  | { __shape: 'array-buffer'; text: string }
  | { __shape: 'bigint'; value: string }
  | { __shape: 'buffer'; text: string }
  | { __shape: 'circular'; name: string }
  | { __shape: 'date'; iso: string }
  | { __shape: 'filled-buffer'; fill: string; length: number }
  | { __shape: 'function-properties'; data: string }
  | { __shape: 'symbol-properties'; name: string }
  | { __shape: 'undefined' }
  | { __shape: 'uint8-array'; text: string };

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
  expect: RejectExpectation | SuccessExpectation;
  name: string;
  request: RequestDefinition;
};

const originalFetch = globalThis.fetch;

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

const ctx = {
  client: FetchClient.create()
};

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return typeof value === 'object' && value !== null && '__shape' in value;
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (isRuntimeTag(value)) {
    if (value.__shape === 'undefined') {
      return undefined;
    }

    if (value.__shape === 'bigint') {
      return BigInt(value.value);
    }

    if (value.__shape === 'buffer') {
      return Buffer.from(value.text, 'utf8');
    }

    if (value.__shape === 'array-buffer') {
      return new TextEncoder().encode(value.text).buffer;
    }

    if (value.__shape === 'uint8-array') {
      return new TextEncoder().encode(value.text);
    }

    if (value.__shape === 'filled-buffer') {
      return Buffer.alloc(value.length, value.fill);
    }

    if (value.__shape === 'date') {
      return new Date(value.iso);
    }

    if (value.__shape === 'circular') {
      const circular: { name: string; self?: unknown } = { name: value.name };
      circular.self = circular;
      return circular;
    }

    if (value.__shape === 'symbol-properties') {
      const symbol = Symbol(value.name);
      return {
        [symbol]: 'symbol value',
        name: value.name
      };
    }

    if (value.__shape === 'function-properties') {
      return {
        data: value.data,
        method: () => 'function'
      };
    }

    throw new Error(`Unknown runtime tag: ${value.__shape satisfies never}`);
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

async function readBodyText(body: BodyInit | null | undefined): Promise<string> {
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

async function bodySerializationFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input));
  const method = init?.method ?? 'GET';
  const bodyText = await readBodyText(init?.body as BodyInit | null | undefined);
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
  if ('messageIncludes' in scenarioCase.expect) {
    await assert.rejects(async () => {
      await invokeRequest(scenarioCase.request);
    }, (error: Error) => {
      assert.ok(error instanceof TypeError);
      assert.strictEqual(error.name, scenarioCase.expect.name);
      for (const expectedMessagePart of scenarioCase.expect.messageIncludes) {
        assert.ok(error.message.includes(expectedMessagePart));
      }
      return true;
    });
    return;
  }

  const response = await invokeRequest(scenarioCase.request);
  assert.strictEqual(response.status, scenarioCase.expect.status);

  if (scenarioCase.expect.json !== undefined) {
    const expectedJson = materializeRuntimeValue(scenarioCase.expect.json);
    assert.deepStrictEqual(await response.json(), expectedJson);
  }
}

void describe('FetchClient Body Serialization', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      globalThis.fetch = bodySerializationFetch;
      await runCase(scenario);
    });
  }
});
