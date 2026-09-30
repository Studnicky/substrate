import type { JsonValueEntity } from '@studnicky/json/entities';
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import { JsonObject } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import { AbortError, FetchClient, TimeoutError } from '../../../src/node/index.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import { FeaturesScenarioCaseEntity } from './entities/FeaturesScenarioCaseEntity.js';
import scenarioGroups from './features.scenarios.json' with { 'type': 'json' };

class FeaturesRunners {
  private static readonly testClient = FetchClient.create();

  static async 'abort-details'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'abort-details'>): Promise<void> {
    using server = TestServer.start();
    const controller = new AbortController();
    setTimeout(() => { controller.abort(new AbortError(`${server.url}/delay`)); }, 10);
    const caught = await RejectionProbe.capture(async () => {
      await FeaturesRunners.testClient.get(`${server.url}/delay`, { 'signal': controller.signal });
    });
    assert.ok(caught instanceof AbortError);
    assert.ok(caught.url.includes(scenarioCase.expected.urlIncludes));
  }

  static async 'abort-first'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'abort-first'>): Promise<void> {
    using server = TestServer.start();
    const controller = new AbortController();
    setTimeout(() => { controller.abort(new AbortError(`${server.url}/delay`)); }, 50);
    const caught = await RejectionProbe.capture(async () => {
      await FeaturesRunners.testClient.get(`${server.url}/delay`, {
        'signal': controller.signal,
        'timeout': 5000
      });
    });
    assert.ok(caught instanceof AbortError);
    assert.equal(caught.name, scenarioCase.expected.abortErrorName);
  }

  static async 'abort-in-get'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'abort-in-get'>): Promise<void> {
    using server = TestServer.start();
    const controller = new AbortController();
    setTimeout(() => { controller.abort(new AbortError(`${server.url}/delay`)); }, 50);
    const caught = await RejectionProbe.capture(async () => {
      await FeaturesRunners.testClient.get(`${server.url}/delay`, { 'signal': controller.signal });
    });
    assert.ok(caught instanceof AbortError);
    assert.equal(caught.name, scenarioCase.expected.abortErrorName);
  }

  static async 'baseURL-keep-absolute'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'baseURL-keep-absolute'>): Promise<void> {
    await FeaturesRunners.runStatusScenario(scenarioCase);
  }

  static async 'baseURL-path-without-leading-slash'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'baseURL-path-without-leading-slash'>): Promise<void> {
    await FeaturesRunners.runStatusScenario(scenarioCase);
  }

  static async 'baseURL-prepend-relative'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'baseURL-prepend-relative'>): Promise<void> {
    await FeaturesRunners.runStatusScenario(scenarioCase);
  }

  static async 'baseURL-trailing-slash'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'baseURL-trailing-slash'>): Promise<void> {
    await FeaturesRunners.runStatusScenario(scenarioCase);
  }

  static async 'headers-apply-defaults'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'headers-apply-defaults'>): Promise<void> {
    await FeaturesRunners.runStatusScenario(scenarioCase);
  }

  static async 'headers-merge-default-and-request'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'headers-merge-default-and-request'>): Promise<void> {
    await FeaturesRunners.runStatusScenario(scenarioCase);
  }

  static async 'headers-override-defaults'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'headers-override-defaults'>): Promise<void> {
    await FeaturesRunners.runStatusScenario(scenarioCase);
  }

  static async 'params-apply-defaults-with-baseURL'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'params-apply-defaults-with-baseURL'>): Promise<void> {
    using server = TestServer.start();
    const config = FeaturesRunners.materializeConfig(scenarioCase.input.fetchClient, server.url);
    const client = FetchClient.create(config);
    const request = FeaturesRunners.materializeRequest(scenarioCase.input.request, server.url);
    const response = await client.get(request.url);
    assert.strictEqual(response.status, 200);
    const data: unknown = await response.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length <= scenarioCase.expected.itemsLengthAtMost);
  }

  static async 'params-apply-defaults-without-baseURL'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'params-apply-defaults-without-baseURL'>): Promise<void> {
    using server = TestServer.start();
    const config = FeaturesRunners.materializeConfig(scenarioCase.input.fetchClient, server.url);
    const client = FetchClient.create(config);
    const request = FeaturesRunners.materializeRequest(scenarioCase.input.request, server.url);
    const response = await client.get(request.url);
    assert.strictEqual(response.status, 200);
    const data = ScenarioValues.requireRecord(await response.json(), 'response body');
    assert.deepStrictEqual(data.query, scenarioCase.expected.query);
  }

  static async 'timeout-first'(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'timeout-first'>): Promise<void> {
    using server = TestServer.start();
    const controller = new AbortController();
    const caught = await RejectionProbe.capture(async () => {
      await FeaturesRunners.testClient.get(`${server.url}/delay`, {
        'signal': controller.signal,
        'timeout': 100
      });
    });
    assert.ok(caught instanceof TimeoutError);
    assert.equal(caught.name, scenarioCase.expected.timeoutErrorName);
  }

  private static materializeConfig(config: Record<string, JsonValueEntity.Type | undefined>, serverUrl: string): Record<string, unknown> {
    const entries = new Map<string, unknown>();
    const pairs = Object.entries(config);
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index] ?? ['', null];
      entries.set(pair[0], FeaturesRunners.resolveValue(pair[1] ?? null, serverUrl));
    }
    const record = JsonObject.fromEntries(entries);
    return record;
  }

  private static materializeRequest(requestInput: Record<string, JsonValueEntity.Type | undefined>, serverUrl: string): { 'options'?: Record<string, unknown>; 'url': string } {
    const request = FeaturesRunners.materializeConfig(requestInput, serverUrl);
    const url = ScenarioValues.requireString(request.url, 'request.url');
    const options = typeof request.options === 'object' && request.options !== null && !Array.isArray(request.options)
      ? { 'options': ScenarioValues.requireRecord(request.options, 'request.options') }
      : {};
    const materialized = { ...options, 'url': url };
    return materialized;
  }

  private static resolveValue(value: JsonValueEntity.Type, serverUrl: string): JsonValueEntity.Type {
    if (typeof value === 'string') {
      const resolvedText = value.split('__TEST_URL__').join(serverUrl);
      return resolvedText;
    }
    if (Array.isArray(value)) {
      const items: JsonValueEntity.Type[] = [];
      for (let index = 0; index < value.length; index += 1) {
        items.push(FeaturesRunners.resolveValue(value[index] ?? null, serverUrl));
      }
      return items;
    }
    if (typeof value === 'object' && value !== null) {
      const entries = new Map<string, JsonValueEntity.Type>();
      const pairs = Object.entries(value);
      for (let index = 0; index < pairs.length; index += 1) {
        const pair = pairs[index] ?? ['', null];
        entries.set(pair[0], FeaturesRunners.resolveValue(pair[1], serverUrl));
      }
      const resolved = JsonObject.fromEntries(entries);
      return resolved;
    }
    return value;
  }

  private static async runStatusScenario(scenarioCase: ScenarioCaseOfType<FeaturesScenarioCaseEntity.Type, 'baseURL-keep-absolute' | 'baseURL-path-without-leading-slash' | 'baseURL-prepend-relative' | 'baseURL-trailing-slash' | 'headers-apply-defaults' | 'headers-merge-default-and-request' | 'headers-override-defaults'>): Promise<void> {
    using server = TestServer.start();
    const config = FeaturesRunners.materializeConfig(scenarioCase.input.fetchClient, server.url);
    const client = FetchClient.create(config);
    const request = FeaturesRunners.materializeRequest(scenarioCase.input.request, server.url);
    const response = await client.get(request.url, request.options);
    assert.strictEqual(response.status, scenarioCase.expected.status);
  }
}

ScenarioSuite.register({
  'entity': FeaturesScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'fetch integration features',
  'runners': FeaturesRunners
});
