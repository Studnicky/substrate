import assert from 'node:assert/strict';
import {
  after, before, describe, it
} from 'node:test';

import { FetchClient } from '../../../src/index.js';
import {
  startTestServer, stopTestServer
} from '../../helpers/test-server/index.js';

type RuntimeTag = { __kind: 'undefined' };
type RuntimeValue =
  | null
  | boolean
  | number
  | string
  | RuntimeTag
  | RuntimeValue[]
  | { [key: string]: RuntimeValue };

type ScenarioCase = {
  clientConfig?: {
    headers?: RuntimeValue;
  };
  description: string;
  expect:
    | { kind: 'ok'; status: number }
    | { errorType?: 'TypeError'; kind: 'reject'; messageIncludes?: readonly string[] };
  name: string;
  request?:
    | { body?: RuntimeValue; headers?: Record<string, string>; method: 'GET' | 'POST'; path: string }
    | { acceptValues?: readonly string[]; method: 'GET'; path: string }
    | { headerCount: number; method: 'GET'; path: string };
};

import scenarioGroups from './headers.errors.scenarios.json';

let testUrl: string;

void before(async () => {
  testUrl = await startTestServer();
});

void after(async () => {
  await stopTestServer();
});

function materializeRuntimeValue(value: RuntimeValue): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeRuntimeValue(item); });
  }

  if (value !== null && typeof value === 'object') {
    if ('__kind' in value) {
      if (value.__kind === 'undefined') {
        return undefined;
      }
      throw new Error(`Unknown runtime tag: ${value.__kind satisfies never}`);
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
  const request = scenarioCase.request;
  const clientConfig = {
    baseURL: testUrl,
    ...(scenarioCase.clientConfig === undefined ? {} : (scenarioCase.clientConfig.headers === undefined ? {} : { headers: materializeRuntimeValue(scenarioCase.clientConfig.headers) as never }))
  };

  if (scenarioCase.expect.kind === 'reject') {
    if (request === undefined) {
      assert.throws(() => {
        FetchClient.create(clientConfig as never);
      }, (error: Error) => {
        for (const expectedMessagePart of scenarioCase.expect.messageIncludes ?? []) {
          assert.ok(error.message.toLowerCase().includes(expectedMessagePart.toLowerCase()));
        }
        return true;
      });
      return;
    }

    const clientInstance = FetchClient.create(clientConfig as never);
    const headers = 'headerCount' in request ? buildHeaders(request.headerCount) : request.headers;
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
        await clientInstance.get(request.path, options);
      } else {
        await clientInstance.post(request.path, options);
      }
    }, (error: Error) => {
      if (scenarioCase.expect.errorType === 'TypeError') {
        assert.ok(error instanceof TypeError);
      }
      for (const expectedMessagePart of scenarioCase.expect.messageIncludes ?? []) {
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
      assert.strictEqual(response.status, scenarioCase.expect.status);
    }
    return;
  }

  const headers = 'headerCount' in request ? buildHeaders(request.headerCount) : request.headers;
  const options = {
    ...(headers === undefined ? {} : { headers }),
    ...(request.body === undefined ? {} : { body: materializeRuntimeValue(request.body) })
  };

  const response = request.method === 'GET'
    ? await clientInstance.get(request.path, options)
    : await clientInstance.post(request.path, options);

  assert.strictEqual(response.status, scenarioCase.expect.status);
}

void describe('Headers Error Scenarios', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
