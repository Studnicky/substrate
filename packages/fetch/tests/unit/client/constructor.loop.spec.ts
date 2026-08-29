import { RuntimeError } from '@studnicky/errors';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  type ClientConfigInterface,
  ConfigurationError,
  FetchClient,
  type FetchOptionsInterface,
  type RequestContextInterface
} from '../../../src/index.js';

import scenarioGroups from './constructor.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'valid-no-config'
  | 'valid-baseURL'
  | 'valid-headers'
  | 'valid-timeout'
  | 'valid-dispatcher'
  | 'valid-requestIdGenerator'
  | 'valid-autoGenerateRequestId-false'
  | 'valid-metadata'
  | 'valid-default-parameters'
  | 'valid-fetch-options'
  | 'invalid-baseURL'
  | 'invalid-timeout-negative'
  | 'invalid-timeout-non-numeric'
  | 'invalid-headers-object'
  | 'invalid-unknown-keys'
  | 'invalid-requestIdGenerator'
  | 'invalid-requestIdGenerator-return-type'
  | 'invalid-requestIdGenerator-throws'
  | 'behavior-baseURL'
  | 'behavior-default-timeout'
  | 'behavior-custom-requestIdGenerator'
  | 'behavior-explicit-requestId'
  | 'behavior-metadata-merge'
  | 'behavior-detach-mutable-config'
  | 'behavior-preserve-non-plain-json'
  | 'behavior-preserve-null-prototype-json';

type ScenarioInput = {
  fetchClient: Record<string, unknown>;
  [key: string]: unknown;
};

type ScenarioCase = {
  description: string;
  expected: Record<string, unknown>;
  input: ScenarioInput;
  shape: ScenarioShape;
  name: string;
};

type ConfigRuntimeTag =
  | { shape: 'static-request-id'; value: unknown }
  | { shape: 'throwing-request-id'; message: string };

type ExpectedRuntimeTag = { shape: 'undefined' };
type ConfigRuntimeTagMaterializer<Shape extends ConfigRuntimeTag['shape']> = (value: Extract<ConfigRuntimeTag, { shape: Shape }>) => unknown;
type ExpectedRuntimeTagMaterializer = (value: ExpectedRuntimeTag) => unknown;
type ScenarioRunner = (scenarioCase: ScenarioCase, config: ClientConfigInterface) => Promise<void> | void;

const originalFetch = globalThis.fetch;

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setFetch(handler: typeof fetch): void {
  globalThis.fetch = handler;
}

function responseJson(data: ScenarioCase['expected'][string], status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status
  });
}

function requireString(value: ScenarioCase['expected'][string], label: string): string {
  if (typeof value !== 'string') {
    throw RuntimeError.create(`${label} must be a string`);
  }

  return value;
}

function requireRecord(value: ScenarioCase['expected'][string], label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw RuntimeError.create(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function isConfigRuntimeTag(value: Record<string, unknown>): value is ConfigRuntimeTag {
  return typeof value.shape === 'string' && value.shape in configRuntimeTagMap;
}

const configRuntimeTagMap: { [Shape in ConfigRuntimeTag['shape']]: ConfigRuntimeTagMaterializer<Shape> } = {
  'static-request-id': (value) => {
    return () => value.value;
  },
  'throwing-request-id': (value) => {
    return () => { throw RuntimeError.create(value.message); };
  }
};

const expectedRuntimeTagMap: Record<ExpectedRuntimeTag['shape'], ExpectedRuntimeTagMaterializer> = {
  undefined: () => undefined
};

function materializeConfigRuntimeTag<Shape extends ConfigRuntimeTag['shape']>(record: Extract<ConfigRuntimeTag, { shape: Shape }>): unknown {
  return configRuntimeTagMap[record.shape](record);
}

function materializeConfigValue(value: ScenarioInput[string]): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeConfigValue(item); });
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (isConfigRuntimeTag(record)) {
      return materializeConfigRuntimeTag(record);
    }

    return Object.fromEntries(
      Object.entries(record).map(([key, nested]) => [key, materializeConfigValue(nested)])
    );
  }

  return value;
}

function isExpectedRuntimeTag(value: ScenarioCase['expected'][string]): value is ExpectedRuntimeTag {
  const record = value as { shape?: unknown };
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof record.shape === 'string' &&
    record.shape in expectedRuntimeTagMap
  );
}

function materializeExpectedValue(value: ScenarioCase['expected'][string]): unknown {
  if (isExpectedRuntimeTag(value)) {
    return expectedRuntimeTagMap[value.shape](value);
  }

  return value;
}

/**
 * Assigns `value` to `target[key]` under `exactOptionalPropertyTypes`, where an
 * optional field must be deleted rather than explicitly set to `undefined`.
 */
function applyOptionalField<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value === undefined) {
    delete target[key];
  } else {
    target[key] = value;
  }
}

function assertAcceptedClient(client: FetchClient): void {
  assert.ok(client instanceof FetchClient);
}

function runValidNoConfig(): void {
  assertAcceptedClient(FetchClient.create());
}

function runValidConfig(_scenarioCase: ScenarioCase, config: ClientConfigInterface): void {
  assertAcceptedClient(FetchClient.create(config));
}

function runInvalidConfig(_scenarioCase: ScenarioCase, config: ClientConfigInterface): void {
  assert.throws(() => { FetchClient.create(config); }, (error: Error) => {
    assert.ok(error instanceof ConfigurationError);
    assert.ok(error.message.length > 0);
    return true;
  });
}

async function runBaseUrlBehavior(scenarioCase: ScenarioCase, config: ClientConfigInterface): Promise<void> {
  setFetch(async (input): Promise<Response> => {
    assert.strictEqual(String(input), requireString(scenarioCase.expected.requestUrl, 'expected.requestUrl'));
    return responseJson(scenarioCase.expected.body);
  });

  const client = FetchClient.create(config);
  const response = await client.get(requireString(scenarioCase.input.requestPath, 'input.requestPath'));
  assert.strictEqual(response.status, scenarioCase.expected.status);
  assert.deepStrictEqual(await response.json(), scenarioCase.expected.body);
}

async function runDefaultTimeoutBehavior(scenarioCase: ScenarioCase, config: ClientConfigInterface): Promise<void> {
  setFetch((_: Request | URL | string, init?: RequestInit): Promise<Response> => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal === undefined || signal === null) {
        return;
      }

      if (signal.aborted) {
        reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));
        return;
      }

      void signal.addEventListener('abort', () => {
        reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));
      }, { once: true });
    });
  });

  const client = FetchClient.create(config);
  await assert.rejects(async () => {
    await client.get(requireString(scenarioCase.input.requestPath, 'input.requestPath'));
  }, (error) => {
    assert.ok(error instanceof Error);
    assert.strictEqual(error.name, scenarioCase.expected.errorName);
    if (error instanceof Error && 'timeoutMs' in error) {
      assert.strictEqual((error as { timeoutMs?: number }).timeoutMs, scenarioCase.expected.timeoutMs);
    }
    return true;
  });
}

async function runCustomRequestIdBehavior(scenarioCase: ScenarioCase, config: ClientConfigInterface): Promise<void> {
  const generatedIds: string[] = [];

  class TrackingClient extends FetchClient {
    protected override onRequestStart(_method: string, _path: string, requestId: string, _url: string): void {
      generatedIds.push(requestId);
    }
  }

  setFetch(async (): Promise<Response> => {
    return responseJson(scenarioCase.expected.body);
  });

  const client = TrackingClient.create(config);

  await client.get(requireString(scenarioCase.input.requestPath, 'input.requestPath'));
  assert.strictEqual(generatedIds[0], scenarioCase.expected.requestId);
}

async function runExplicitRequestIdBehavior(scenarioCase: ScenarioCase, config: ClientConfigInterface): Promise<void> {
  const capturedRequestIds: string[] = [];

  class RequestIdClient extends FetchClient {
    protected override onRequestStart(_method: string, _path: string, requestId: string, _url: string): void {
      capturedRequestIds.push(requestId);
    }
  }

  setFetch(async (): Promise<Response> => {
    return responseJson(scenarioCase.expected.body);
  });

  const client = RequestIdClient.create(config);

  await client.get(requireString(scenarioCase.input.requestPath, 'input.requestPath'), {
    requestId: requireString(scenarioCase.expected.requestId, 'expected.requestId')
  });
  assert.strictEqual(capturedRequestIds[0], scenarioCase.expected.requestId);
}

async function runMetadataMergeBehavior(scenarioCase: ScenarioCase, config: ClientConfigInterface): Promise<void> {
  const capturedMetadata: Record<string, unknown>[] = [];

  class MetadataClient extends FetchClient {
    protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
      capturedMetadata.push({ ...context.metadata.metadata });
      return context;
    }
  }

  setFetch(async (): Promise<Response> => {
    return responseJson(scenarioCase.expected.body);
  });

  const client = MetadataClient.create(config);

  await client.get(requireString(scenarioCase.input.requestPath, 'input.requestPath'), {
    metadata: requireRecord(scenarioCase.input.requestMetadata, 'input.requestMetadata')
  });

  assert.ok(capturedMetadata[0] !== undefined);
  assert.deepStrictEqual(capturedMetadata[0], scenarioCase.expected.metadata);
}

async function runDetachMutableConfigBehavior(scenarioCase: ScenarioCase): Promise<void> {
  let capturedContext: RequestContextInterface | undefined;

  class SnapshotClient extends FetchClient {
    protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
      capturedContext = context;
      return context;
    }
  }

  setFetch(async (): Promise<Response> => {
    return responseJson(scenarioCase.expected.body);
  });

  const mutableConfig = materializeConfigValue(scenarioCase.input.fetchClient) as ClientConfigInterface;
  const client = SnapshotClient.create(mutableConfig);
  const replacementConfig = materializeConfigValue(scenarioCase.input.replacementFetchClient) as ClientConfigInterface;
  mutableConfig.baseURL = replacementConfig.baseURL;
  applyOptionalField(mutableConfig, 'headers', replacementConfig.headers);
  applyOptionalField(mutableConfig, 'metadata', replacementConfig.metadata);
  applyOptionalField(mutableConfig, 'options', replacementConfig.options);
  applyOptionalField(mutableConfig, 'parameters', replacementConfig.parameters);

  await client.get(requireString(scenarioCase.input.requestPath, 'input.requestPath'));

  assert.ok(capturedContext !== undefined);
  assert.strictEqual(capturedContext.url, scenarioCase.expected.url);
  assert.deepStrictEqual(capturedContext.metadata.metadata, scenarioCase.expected.metadata);
  assert.deepStrictEqual(capturedContext.options.headers, scenarioCase.expected.headers);
  assert.deepStrictEqual(capturedContext.options.metadata, scenarioCase.expected.optionsMetadata);
  assert.deepStrictEqual(capturedContext.options.json, scenarioCase.expected.json);
  // `parameters` is never part of `FetchOptionsInterface` — resolved query parameters are folded
  // into the request URL instead — so this asserts the field does not leak onto options.
  const optionsWithParameters = capturedContext.options as FetchOptionsInterface & { parameters?: unknown };
  assert.deepStrictEqual(optionsWithParameters.parameters, materializeExpectedValue(scenarioCase.expected.parameters));
}

async function runPreserveNonPlainJsonBehavior(scenarioCase: ScenarioCase): Promise<void> {
  let capturedContext: RequestContextInterface | undefined;

  class JsonBox {
    readonly shape = 'boxed-json' as const;
    value: string;

    constructor(value: string) {
      this.value = value;
    }
  }

  class SnapshotClient extends FetchClient {
    protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
      capturedContext = context;
      return context;
    }
  }

  setFetch(async (): Promise<Response> => {
    return responseJson(scenarioCase.expected.body);
  });

  const boxedJsonFixture = requireRecord(scenarioCase.input.boxedJson, 'input.boxedJson');
  const boxedJson = new JsonBox(requireString(boxedJsonFixture.value, 'input.boxedJson.value'));
  const mutableConfig = materializeConfigValue(scenarioCase.input.fetchClient) as ClientConfigInterface;
  mutableConfig.options = { json: boxedJson };
  const client = SnapshotClient.create(mutableConfig);
  boxedJson.value = requireString(boxedJsonFixture.mutatedValue, 'input.boxedJson.mutatedValue');

  await client.get(requireString(scenarioCase.input.requestPath, 'input.requestPath'));

  const expectedJson = requireRecord(scenarioCase.expected.json, 'expected.json');
  assert.ok(capturedContext !== undefined);
  assert.ok(capturedContext.options.json instanceof JsonBox);
  assert.strictEqual(capturedContext.options.json, boxedJson);
  assert.strictEqual(capturedContext.options.json.shape, expectedJson.shape);
  assert.strictEqual(capturedContext.options.json.value, expectedJson.value);
}

async function runPreserveNullPrototypeJsonBehavior(scenarioCase: ScenarioCase): Promise<void> {
  let capturedContext: RequestContextInterface | undefined;

  class SnapshotClient extends FetchClient {
    protected override async onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
      capturedContext = context;
      return context;
    }
  }

  setFetch(async (): Promise<Response> => {
    return responseJson(scenarioCase.expected.body);
  });

  const nullProtoJson = Object.create(null) as Record<string, unknown>;
  Object.assign(nullProtoJson, materializeConfigValue(scenarioCase.input.nullPrototypeJson));

  const mutableConfig = materializeConfigValue(scenarioCase.input.fetchClient) as ClientConfigInterface;
  mutableConfig.options = { json: nullProtoJson };
  const client = SnapshotClient.create(mutableConfig);
  Object.assign(nullProtoJson, materializeConfigValue(scenarioCase.input.mutatedNullPrototypeJson));

  await client.get(requireString(scenarioCase.input.requestPath, 'input.requestPath'));

  assert.ok(capturedContext !== undefined);
  assert.deepStrictEqual(capturedContext.options.json, scenarioCase.expected.json);
}

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'behavior-baseURL': runBaseUrlBehavior,
  'behavior-custom-requestIdGenerator': runCustomRequestIdBehavior,
  'behavior-default-timeout': runDefaultTimeoutBehavior,
  'behavior-detach-mutable-config': runDetachMutableConfigBehavior,
  'behavior-explicit-requestId': runExplicitRequestIdBehavior,
  'behavior-metadata-merge': runMetadataMergeBehavior,
  'behavior-preserve-non-plain-json': runPreserveNonPlainJsonBehavior,
  'behavior-preserve-null-prototype-json': runPreserveNullPrototypeJsonBehavior,
  'invalid-baseURL': runInvalidConfig,
  'invalid-headers-object': runInvalidConfig,
  'invalid-requestIdGenerator': runInvalidConfig,
  'invalid-requestIdGenerator-return-type': runInvalidConfig,
  'invalid-requestIdGenerator-throws': runInvalidConfig,
  'invalid-timeout-negative': runInvalidConfig,
  'invalid-timeout-non-numeric': runInvalidConfig,
  'invalid-unknown-keys': runInvalidConfig,
  'valid-autoGenerateRequestId-false': runValidConfig,
  'valid-baseURL': runValidConfig,
  'valid-default-parameters': runValidConfig,
  'valid-dispatcher': runValidConfig,
  'valid-fetch-options': runValidConfig,
  'valid-headers': runValidConfig,
  'valid-metadata': runValidConfig,
  'valid-no-config': runValidNoConfig,
  'valid-requestIdGenerator': runValidConfig,
  'valid-timeout': runValidConfig
};

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  const config = materializeConfigValue(scenarioCase.input.fetchClient) as ClientConfigInterface;
  await runnerMap[scenarioCase.shape](scenarioCase, config);
}

void describe('FetchClient Constructor', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
