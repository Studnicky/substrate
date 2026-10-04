import type { JsonValueEntity } from '@studnicky/json/entities';

import { JsonObject, Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { RequestContextInterface } from '../../../src/node/index.js';

import { ScenarioSuite, ScenarioValues } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { FetchClientConfiguration } from '../../../src/modules/FetchClientConfiguration.js';
import { ConfigurationError, FetchClient, TimeoutError } from '../../../src/node/index.js';
import { AbortAwareFetch } from '../../helpers/AbortAwareFetch.js';
import { InvalidClientFactory } from '../../helpers/InvalidClientFactory.js';
import { PlatformCalls } from '../../helpers/PlatformCalls.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import { StubbedFetch } from '../../helpers/StubbedFetch.js';
import scenarioGroups from './constructor.scenarios.json' with { 'type': 'json' };
import { ConstructorScenarioCaseEntity } from './entities/ConstructorScenarioCaseEntity.js';

class TrackingClient extends FetchClient {
  readonly requestIds: string[] = [];

  protected override onRequestStart(_method: string, _path: string, requestId: string, _url: string): void {
    this.requestIds.push(requestId);
  }
}

class MetadataCapturingClient extends FetchClient {
  readonly capturedMetadata: object[] = [];

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    this.capturedMetadata.push({ ...context.metadata.metadata });
    const passedThrough = Promise.resolve(context);
    return passedThrough;
  }
}

class SnapshotClient extends FetchClient {
  capturedContext: RequestContextInterface | undefined;

  protected override onRequest(context: RequestContextInterface): Promise<RequestContextInterface> {
    this.capturedContext = context;
    const passedThrough = Promise.resolve(context);
    return passedThrough;
  }
}

class JsonBox {
  readonly shape = 'boxed-json' as const;
  value: string;

  constructor(value: string) {
    this.value = value;
  }
}

class ConstructorRunners {
  static 'accepts-config'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'accepts-config', 'operation'>): void {
    const config = ConstructorRunners.materializeConfig(scenarioCase.input.fetchClient);
    const client = InvalidClientFactory.create(config);
    assert.ok(client instanceof FetchClient);
  }

  static 'accepts-no-config'(_scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'accepts-no-config', 'operation'>): void {
    assert.ok(FetchClient.create() instanceof FetchClient);
  }

  static async 'base-url'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'base-url', 'operation'>): Promise<void> {
    const config = ConstructorRunners.materializeConfig(scenarioCase.input.fetchClient);
    using stub = StubbedFetch.install(ConstructorRunners.responseJson(scenarioCase.expected.body, 200));
    const client = InvalidClientFactory.create(config);
    const response = await client.get(scenarioCase.input.requestPath);
    assert.strictEqual(stub.url, scenarioCase.expected.requestUrl);
    assert.strictEqual(response.status, scenarioCase.expected.status);
    assert.deepStrictEqual(await response.json(), scenarioCase.expected.body);
  }

  static async 'custom-request-id'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'custom-request-id', 'operation'>): Promise<void> {
    const config = ConstructorRunners.materializeConfig(scenarioCase.input.fetchClient);
    using _ = StubbedFetch.install(ConstructorRunners.responseJson(scenarioCase.expected.body, 200));
    const client = InvalidClientFactory.createWith<TrackingClient>(TrackingClient, config);

    await client.get(scenarioCase.input.requestPath);
    assert.strictEqual(client.requestIds[0], scenarioCase.expected.requestId);
  }

  static async 'default-timeout'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'default-timeout', 'operation'>): Promise<void> {
    const config = ConstructorRunners.materializeConfig(scenarioCase.input.fetchClient);
    using _ = AbortAwareFetch.install();
    const client = InvalidClientFactory.create(config);
    const caught = await RejectionProbe.capture(async () => {
      await client.get(scenarioCase.input.requestPath);
    });
    assert.ok(caught instanceof Error);
    assert.strictEqual(caught.name, scenarioCase.expected.errorName);
    if (caught instanceof TimeoutError) {
      assert.strictEqual(caught.timeoutMs, scenarioCase.expected.timeoutMs);
    }
  }

  static async 'detach-mutable-config'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'detach-mutable-config', 'operation'>): Promise<void> {
    using _ = StubbedFetch.install(ConstructorRunners.emptyResponse());
    const mutableConfig = ConstructorRunners.materializeConfig(scenarioCase.input.fetchClient);
    const client = InvalidClientFactory.createWith<SnapshotClient>(SnapshotClient, mutableConfig);
    const replacementConfig = ConstructorRunners.materializeConfig(scenarioCase.input.replacementFetchClient);
    Reflect.set(mutableConfig, 'baseURL', Reflect.get(replacementConfig, 'baseURL'));
    ConstructorRunners.applyOptionalField(mutableConfig, replacementConfig, 'headers');
    ConstructorRunners.applyOptionalField(mutableConfig, replacementConfig, 'metadata');
    ConstructorRunners.applyOptionalField(mutableConfig, replacementConfig, 'options');
    ConstructorRunners.applyOptionalField(mutableConfig, replacementConfig, 'parameters');

    await client.get(scenarioCase.input.requestPath);

    const { capturedContext } = client;
    assert.ok(capturedContext !== undefined);
    assert.strictEqual(capturedContext.url, scenarioCase.expected.url);
    assert.deepStrictEqual(capturedContext.metadata.metadata, scenarioCase.expected.metadata);
    assert.deepStrictEqual(capturedContext.options.headers, scenarioCase.expected.headers);
    assert.deepStrictEqual(capturedContext.options.metadata, scenarioCase.expected.optionsMetadata);
    assert.deepStrictEqual(capturedContext.options.json, scenarioCase.expected.json);
    // `parameters` is never part of `FetchOptionsInterface` — resolved query parameters are folded
    // into the request URL instead — so this asserts the field does not leak onto options.
    const options: unknown = capturedContext.options;
    assert.ok(Predicates.isObject(options));
    const parameters: unknown = Reflect.get(options, 'parameters');
    assert.deepStrictEqual(parameters, RuntimeValueMaterializer.materialize(scenarioCase.expected.parameters));
  }

  static async 'explicit-request-id'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'explicit-request-id', 'operation'>): Promise<void> {
    const config = ConstructorRunners.materializeConfig(scenarioCase.input.fetchClient);
    using _ = StubbedFetch.install(ConstructorRunners.responseJson(scenarioCase.expected.body, 200));
    const client = InvalidClientFactory.createWith<TrackingClient>(TrackingClient, config);

    await client.get(scenarioCase.input.requestPath, { 'requestId': scenarioCase.expected.requestId });
    assert.strictEqual(client.requestIds[0], scenarioCase.expected.requestId);
  }

  static async 'metadata-merge'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'metadata-merge', 'operation'>): Promise<void> {
    const config = ConstructorRunners.materializeConfig(scenarioCase.input.fetchClient);
    using _ = StubbedFetch.install(ConstructorRunners.responseJson(scenarioCase.expected.body, 200));
    const client = InvalidClientFactory.createWith<MetadataCapturingClient>(MetadataCapturingClient, config);

    await client.get(scenarioCase.input.requestPath, {
      'metadata': ScenarioValues.requireRecord(RuntimeValueMaterializer.materialize(scenarioCase.input.requestMetadata), 'input.requestMetadata')
    });

    assert.ok(client.capturedMetadata[0] !== undefined);
    assert.deepStrictEqual(client.capturedMetadata[0], scenarioCase.expected.metadata);
  }

  static async 'preserve-non-plain-json'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'preserve-non-plain-json', 'operation'>): Promise<void> {
    using _ = StubbedFetch.install(ConstructorRunners.emptyResponse());
    const boxedJsonFixture = scenarioCase.input.boxedJson;
    const boxedJson = new JsonBox(ScenarioValues.requireString(boxedJsonFixture.value, 'input.boxedJson.value'));
    const mutableConfig = ConstructorRunners.materializeConfig(scenarioCase.input.fetchClient);
    Reflect.set(mutableConfig, 'options', { 'json': boxedJson });
    const client = InvalidClientFactory.createWith<SnapshotClient>(SnapshotClient, mutableConfig);
    boxedJson.value = ScenarioValues.requireString(boxedJsonFixture.mutatedValue, 'input.boxedJson.mutatedValue');

    await client.get(scenarioCase.input.requestPath);

    const expectedJson = scenarioCase.expected.json;
    const { capturedContext } = client;
    assert.ok(capturedContext !== undefined);
    assert.ok(capturedContext.options.json instanceof JsonBox);
    assert.strictEqual(capturedContext.options.json, boxedJson);
    assert.strictEqual(capturedContext.options.json.shape, expectedJson.shape);
    assert.strictEqual(capturedContext.options.json.value, expectedJson.value);
  }

  static async 'preserve-null-prototype-json'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'preserve-null-prototype-json', 'operation'>): Promise<void> {
    using _ = StubbedFetch.install(ConstructorRunners.emptyResponse());
    const nullProtoJson: unknown = Object.create(null);
    assert.ok(typeof nullProtoJson === 'object' && nullProtoJson !== null);
    Object.assign(nullProtoJson, RuntimeValueMaterializer.materialize(scenarioCase.input.nullPrototypeJson));

    const mutableConfig = ConstructorRunners.materializeConfig(scenarioCase.input.fetchClient);
    Reflect.set(mutableConfig, 'options', { 'json': nullProtoJson });
    const client = InvalidClientFactory.createWith<SnapshotClient>(SnapshotClient, mutableConfig);
    Object.assign(nullProtoJson, RuntimeValueMaterializer.materialize(scenarioCase.input.mutatedNullPrototypeJson));

    await client.get(scenarioCase.input.requestPath);

    const { capturedContext } = client;
    assert.ok(capturedContext !== undefined);
    assert.deepStrictEqual(capturedContext.options.json, scenarioCase.expected.json);
  }

  static 'rejects-config'(scenarioCase: ScenarioCaseOfType<ConstructorScenarioCaseEntity.Type, 'rejects-config', 'operation'>): void {
    const config = RuntimeValueMaterializer.materialize(scenarioCase.input.fetchClient);
    const caught = RejectionProbe.captureSync(() => {
      const result = FetchClientConfiguration.intake(config);
      return result;
    });
    assert.ok(caught instanceof ConfigurationError);
    assert.ok(caught.message.length > 0);
  }

  /**
   * Copies `key` from `source` onto `target` under `exactOptionalPropertyTypes`, where an
   * optional field must be deleted rather than explicitly set to `undefined`.
   */
  private static applyOptionalField(target: object, source: object, key: string): void {
    const value: unknown = Reflect.get(source, key);
    if (value === undefined) {
      Reflect.deleteProperty(target, key);
    } else {
      JsonObject.write(target, key, value);
    }
  }

  private static materializeConfig(fetchClient: JsonValueEntity.Type): Record<string, unknown> {
    const config = ScenarioValues.requireRecord(RuntimeValueMaterializer.materialize(fetchClient), 'input.fetchClient');
    return config;
  }

  private static emptyResponse(): Response {
    const response = new Response(undefined, {
      'headers': { 'Content-Type': 'application/json' },
      'status': 200
    });
    return response;
  }

  private static responseJson(data: JsonValueEntity.Type, status: number): Response {
    const response = new Response(PlatformCalls.stringify(data), {
      'headers': { 'Content-Type': 'application/json' },
      'status': status
    });
    return response;
  }
}

ScenarioSuite.registerBy('operation', {
  'entity': ConstructorScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FetchClient Constructor',
  'runners': ConstructorRunners
});
