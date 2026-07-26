import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

type RuntimeTag = { __shape: 'undefined' };
type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type ScenarioCase = {
  description: string;
  expected:
    | { shape: 'ok'; status: number }
    | { errorType?: 'TypeError'; shape: 'reject'; messageIncludes?: readonly string[] };
  input: {
    clientConfig?: {
      headers?: RuntimeValue;
    };
    request?: {
      acceptValues?: readonly string[];
      body?: RuntimeValue;
      headerCount?: number;
      headers?: Record<string, string>;
      method: 'GET' | 'POST';
      path: string;
    };
  };
  name: string;
};

import scenarioGroups from './headers.errors.scenarios.json' with { type: 'json' };

let testUrl: string;

void before(async () => {
  testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

function isRuntimeTag(value: RuntimeValue): value is RuntimeTag {
  return typeof value === 'object' && value !== null && '__shape' in value;
}

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (value !== null && typeof value === 'object') {
    if (isRuntimeTag(value)) {
      if (value.__shape === 'undefined') {
        return undefined;
      }
      const exhaustiveCheck: never = value.__shape;
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

function buildHeaders(count: number): Record<string, string> {
  const headers: Record<string, string> = {};
  for (let i = 0; i < count; i++) {
    headers[`X-Header-${i}`] = `value-${i}`;
  }
  return headers;
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const request = scenarioCase.input.request;
  const { expected } = scenarioCase;
  const clientConfig = {
    baseURL: testUrl,
    ...(scenarioCase.input.clientConfig === undefined ? {} : (scenarioCase.input.clientConfig.headers === undefined ? {} : { headers: materializeRuntimeValue(scenarioCase.input.clientConfig.headers) as never }))
  };

  if (expected.shape === 'reject') {
    if (request === undefined) {
      assert.throws(() => {
        FetchClient.create(clientConfig as never);
      }, (error: Error) => {
        for (const expectedMessagePart of expected.messageIncludes ?? []) {
          assert.ok(error.message.toLowerCase().includes(expectedMessagePart.toLowerCase()));
        }
        return true;
      });
      return;
    }

    const clientInstance = FetchClient.create(clientConfig as never);
    const headers = 'headerCount' in request && request.headerCount !== undefined ? buildHeaders(request.headerCount) : request.headers;
    const options = {
      ...(headers === undefined ? {} : { headers }),
      ...(request.body === undefined ? {} : { body: materializeRuntimeValue(request.body) })
    };

    await assert.rejects(async () => {
      if ('acceptValues' in request) {
        for (const accept of request.acceptValues ?? []) {
          await clientInstance.get(request.path, { headers: { Accept: accept } });
        }
        return;
      }

      if (request.method === 'GET') {
        await clientInstance.get(request.path, headers === undefined ? undefined : { headers });
      } else {
        await clientInstance.post(request.path, options);
      }
    }, (error: Error) => {
      if (expected.errorType === 'TypeError') {
        assert.ok(error instanceof TypeError);
      }
      for (const expectedMessagePart of expected.messageIncludes ?? []) {
        assert.ok(error.message.toLowerCase().includes(expectedMessagePart.toLowerCase()));
      }
      return true;
    });
    return;
  }

  const clientInstance = FetchClient.create(clientConfig as never);
  if (request === undefined) {
    assert.fail('scenario request is required for ok cases');
  }

  if ('acceptValues' in request) {
    for (const accept of request.acceptValues ?? []) {
      const response = await clientInstance.get(request.path, { headers: { Accept: accept } });
      assert.strictEqual(response.status, expected.status);
    }
    return;
  }

  const headers = 'headerCount' in request && request.headerCount !== undefined ? buildHeaders(request.headerCount) : request.headers;
  const options = {
    ...(headers === undefined ? {} : { headers }),
    ...(request.body === undefined ? {} : { body: materializeRuntimeValue(request.body) })
  };

  const response = request.method === 'GET'
    ? await clientInstance.get(request.path, headers === undefined ? undefined : { headers })
    : await clientInstance.post(request.path, options);

  assert.strictEqual(response.status, expected.status);
}

void describe('Headers Error Scenarios', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
