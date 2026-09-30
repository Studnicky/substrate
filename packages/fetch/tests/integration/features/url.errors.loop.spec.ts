import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import type { ClientConfigInterface } from '../../../src/interfaces/ClientConfigInterface.js';
import type { BoundedJsonValueEntity } from '../../helpers/entities/BoundedJsonValueEntity.js';

import { FetchClientConfiguration } from '../../../src/modules/FetchClientConfiguration.js';
import { FetchClient, InvalidUrlError, RequestFailedError } from '../../../src/node/index.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import { UrlErrorsScenarioCaseEntity } from './entities/UrlErrorsScenarioCaseEntity.js';
import scenarioGroups from './url.errors.scenarios.json' with { 'type': 'json' };

class UrlErrorsRunners {
  /**
   * Captured when the module loads, before `TestServer.start()` replaces `globalThis.fetch` with the
   * in-process TestDispatcher, so 'rejects-native' cases exercise the real runtime's URL handling
   * instead of the mock transport.
   */
  private static readonly nativeFetch = globalThis.fetch;

  static 'create-ok'(scenarioCase: ScenarioCaseOfType<UrlErrorsScenarioCaseEntity.Type, 'create-ok'>): void {
    using server = TestServer.start();
    const config = UrlErrorsRunners.createConfig(scenarioCase.input.clientConfig?.baseURL, server.url);
    assert.doesNotThrow(() => {
      FetchClientConfiguration.intake(config);
    });
  }

  static 'create-throws'(scenarioCase: ScenarioCaseOfType<UrlErrorsScenarioCaseEntity.Type, 'create-throws'>): void {
    using server = TestServer.start();
    const config = UrlErrorsRunners.createConfig(scenarioCase.input.clientConfig?.baseURL, server.url);
    const caught = RejectionProbe.captureSync(() => {
      const result = FetchClientConfiguration.intake(config);
      return result;
    });
    assert.ok(caught instanceof Error);
    UrlErrorsRunners.assertMessageIncludes(caught, scenarioCase.expected.messageIncludes);
  }

  static async 'rejects'(scenarioCase: ScenarioCaseOfType<UrlErrorsScenarioCaseEntity.Type, 'rejects'>): Promise<void> {
    using server = TestServer.start();
    const clientInstance = UrlErrorsRunners.createClient(scenarioCase.input.clientConfig?.baseURL, server.url);
    const requestUrl = scenarioCase.input.request.url.replaceAll('__TEST_URL__', server.url);
    const caught = await RejectionProbe.capture(async () => {
      await clientInstance.get(requestUrl);
    });
    assert.ok(caught instanceof Error);
    const { expected } = scenarioCase;

    if (expected.error === 'AbortError') {
      assert.strictEqual(caught.name, 'AbortError');
    } else if (expected.error === 'Error') {
      assert.ok(caught.name.includes('Error'));
    } else {
      assert.ok(caught instanceof InvalidUrlError || (caught instanceof RequestFailedError && caught.cause instanceof TypeError));
    }
    UrlErrorsRunners.assertMessageIncludes(caught, expected.messageIncludes);
  }

  static async 'rejects-native'(scenarioCase: ScenarioCaseOfType<UrlErrorsScenarioCaseEntity.Type, 'rejects-native'>): Promise<void> {
    using server = TestServer.start();
    const clientInstance = UrlErrorsRunners.createClient(scenarioCase.input.clientConfig?.baseURL, server.url);
    const requestUrl = scenarioCase.input.request.url.replaceAll('__TEST_URL__', server.url);
    const patchedFetch = globalThis.fetch;
    globalThis.fetch = UrlErrorsRunners.nativeFetch;
    let caught: unknown;
    try {
      caught = await RejectionProbe.capture(async () => {
        await clientInstance.get(requestUrl);
      });
    } finally {
      globalThis.fetch = patchedFetch;
    }
    assert.ok(caught instanceof RequestFailedError);
    const cause: unknown = caught.cause;
    assert.ok(cause instanceof TypeError);
    assert.equal(cause.name, scenarioCase.expected.error);
    UrlErrorsRunners.assertMessageIncludes(caught, scenarioCase.expected.messageIncludes);
  }

  static async 'status'(scenarioCase: ScenarioCaseOfType<UrlErrorsScenarioCaseEntity.Type, 'status'>): Promise<void> {
    using server = TestServer.start();
    const clientInstance = UrlErrorsRunners.createClient(scenarioCase.input.clientConfig?.baseURL, server.url);
    const requestUrl = scenarioCase.input.request.url.replaceAll('__TEST_URL__', server.url);
    const response = await clientInstance.get(requestUrl);
    assert.strictEqual(response.status, scenarioCase.expected.status);
  }

  private static assertMessageIncludes(error: Error, fragments: readonly string[] | undefined): void {
    const expectedFragments = fragments ?? [];
    for (let index = 0; index < expectedFragments.length; index += 1) {
      assert.ok(error.message.toLowerCase().includes((expectedFragments[index] ?? '').toLowerCase()));
    }
  }

  private static createClient(baseURL: BoundedJsonValueEntity.Type | undefined, serverUrl: string): FetchClient {
    const materialized = baseURL === undefined ? undefined : RuntimeValueMaterializer.materializeWithServer(baseURL, serverUrl);
    assert.ok(materialized === undefined || typeof materialized === 'string', 'clientConfig.baseURL materializes to a string for a live FetchClient');
    const clientConfig: ClientConfigInterface = materialized === undefined ? {} : { 'baseURL': materialized };
    const clientInstance = FetchClient.create(clientConfig);
    return clientInstance;
  }

  private static createConfig(baseURL: BoundedJsonValueEntity.Type | undefined, serverUrl: string): { 'baseURL'?: unknown } {
    const config = baseURL === undefined ? {} : { 'baseURL': RuntimeValueMaterializer.materializeWithServer(baseURL, serverUrl) };
    return config;
  }
}

ScenarioSuite.register({
  'entity': UrlErrorsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'URL Error Scenarios',
  'runners': UrlErrorsRunners
});
