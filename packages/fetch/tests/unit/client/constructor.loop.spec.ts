import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  type ClientConfigInterface,
  ConfigurationError,
  FetchClient,
  type RequestContextInterface
} from '../../../src/index.js';

import scenarioGroups from './constructor.scenarios.json';

type ScenarioKind =
  | 'valid-no-config'
  | 'valid-baseURL'
  | 'valid-headers'
  | 'valid-timeout'
  | 'valid-dispatcher'
  | 'valid-requestIdGenerator'
  | 'valid-autoGenerateRequestId-false'
  | 'valid-metadata'
  | 'valid-default-params'
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
  kind: ScenarioKind;
  name: string;
};

type ConfigRuntimeTag =
  | { kind: 'static-request-id'; value: unknown }
  | { kind: 'throwing-request-id'; message: string };

type ExpectedRuntimeTag = { kind: 'undefined' };
type ConfigRuntimeTagMaterializer = (value: ConfigRuntimeTag) => unknown;
type ExpectedRuntimeTagMaterializer = (value: ExpectedRuntimeTag) => unknown;
type ScenarioRunner = (scenarioCase: ScenarioCase, config: ClientConfigInterface) => Promise<void> | void;

const originalFetch = globalThis.fetch;

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setFetch(handler: typeof fetch): void {
  globalThis.fetch = handler;
}

function responseJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status
  });
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`);
  }

  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function isConfigRuntimeTag(value: Record<string, unknown>): value is ConfigRuntimeTag {
  return typeof value.kind === 'string' && value.kind in configRuntimeTagMap;
}

const configRuntimeTagMap: Record<ConfigRuntimeTag['kind'], ConfigRuntimeTagMaterializer> = {
  'static-request-id': (value) => {
    return () => value.value;
  },
  'throwing-request-id': (value) => {
    return () => { throw new Error(value.message); };
  }
};

const expectedRuntimeTagMap: Record<ExpectedRuntimeTag['kind'], ExpectedRuntimeTagMaterializer> = {
  undefined: () => undefined
};

function materializeConfigValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => { return materializeConfigValue(item); });
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (isConfigRuntimeTag(record)) {
      return configRuntimeTagMap[record.kind](record);
    }

    return Object.fromEntries(
      Object.entries(record).map(([key, nested]) => [key, materializeConfigValue(nested)])
    );
  }

  return value;
}

function isExpectedRuntimeTag(value: unknown): value is ExpectedRuntimeTag {
  const record = value as { kind?: unknown };
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof record.kind === 'string' &&
    record.kind in expectedRuntimeTagMap
  );
}

function materializeExpectedValue(value: unknown): unknown {
  if (isExpectedRuntimeTag(value)) {
    return expectedRuntimeTagMap[value.kind](value);
  }

  return value;
}

function assertAcceptedClient(client: FetchClient, scenarioCase: ScenarioCase): void {
  assert.ok(client instanceof FetchClient);
  assert.equal(scenarioCase.expected.accepted, true);
}

function runValidNoConfig(scenarioCase: ScenarioCase): void {
  assertAcceptedClient(FetchClient.create(), scenarioCase);
}

function runValidConfig(scenarioCase: ScenarioCase, config: ClientConfigInterface): void {
  assertAcceptedClient(FetchClient.create(config), scenarioCase);
}

function runInvalidConfig(scenarioCase: ScenarioCase, config: ClientConfigInterface): void {
  assert.throws(() => { FetchClient.create(config); }, (error: Error) => {
    assert.ok(error instanceof ConfigurationError);
    assert.strictEqual(error.message, requireString(scenarioCase.expected.message, 'expected.message'));
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
  setFetch((_: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (signal === undefined) {
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
  }, (error: unknown) => {
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
    static override create(config: Parameters<typeof FetchClient.create>[0] = {}): TrackingClient {
      return new this(config);
    }

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
    static override create(config: Parameters<typeof FetchClient.create>[0] = {}): RequestIdClient {
      return new this(config);
    }

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
    static override create(config: Parameters<typeof FetchClient.create>[0] = {}): MetadataClient {
      return new this(config);
    }

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
    static override create(config: ClientConfigInterface = {}): SnapshotClient {
      return new this(config);
    }

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
  mutableConfig.headers = replacementConfig.headers;
  mutableConfig.metadata = replacementConfig.metadata;
  mutableConfig.options = replacementConfig.options;
  mutableConfig.params = replacementConfig.params;

  await client.get(requireString(scenarioCase.input.requestPath, 'input.requestPath'));

  assert.ok(capturedContext !== undefined);
  assert.strictEqual(capturedContext.url, scenarioCase.expected.url);
  assert.deepStrictEqual(capturedContext.metadata.metadata, scenarioCase.expected.metadata);
  assert.deepStrictEqual(capturedContext.options.headers, scenarioCase.expected.headers);
  assert.deepStrictEqual(capturedContext.options.metadata, scenarioCase.expected.optionsMetadata);
  assert.deepStrictEqual(capturedContext.options.json, scenarioCase.expected.json);
  assert.deepStrictEqual(capturedContext.options.params, materializeExpectedValue(scenarioCase.expected.params));
}

async function runPreserveNonPlainJsonBehavior(scenarioCase: ScenarioCase): Promise<void> {
  let capturedContext: RequestContextInterface | undefined;

  class JsonBox {
    readonly kind = 'boxed-json' as const;
    value: string;

    constructor(value: string) {
      this.value = value;
    }
  }

  class SnapshotClient extends FetchClient {
    static override create(config: ClientConfigInterface = {}): SnapshotClient {
      return new this(config);
    }

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
  assert.strictEqual(capturedContext.options.json.kind, expectedJson.kind);
  assert.strictEqual(capturedContext.options.json.value, expectedJson.value);
}

async function runPreserveNullPrototypeJsonBehavior(scenarioCase: ScenarioCase): Promise<void> {
  let capturedContext: RequestContextInterface | undefined;

  class SnapshotClient extends FetchClient {
    static override create(config: ClientConfigInterface = {}): SnapshotClient {
      return new this(config);
    }

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

const runnerMap: Record<ScenarioKind, ScenarioRunner> = {
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
  'valid-default-params': runValidConfig,
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
  await runnerMap[scenarioCase.kind](scenarioCase, config);
}

void describe('FetchClient Constructor', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
