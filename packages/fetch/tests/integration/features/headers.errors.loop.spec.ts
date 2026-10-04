import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { FetchClient } from '../../../src/node/index.js';
import type { BoundedJsonValueEntity } from '../../helpers/entities/BoundedJsonValueEntity.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { RequestFailedError } from '../../../src/node/index.js';
import { InvalidClientFactory } from '../../helpers/InvalidClientFactory.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { RuntimeValueMaterializer } from '../../helpers/RuntimeValueMaterializer.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import { HeadersErrorsScenarioCaseEntity } from './entities/HeadersErrorsScenarioCaseEntity.js';
import scenarioGroups from './headers.errors.scenarios.json' with { 'type': 'json' };

class HeadersErrorsRunners {
  static async 'ok'(scenarioCase: ScenarioCaseOfType<HeadersErrorsScenarioCaseEntity.Type, 'ok'>): Promise<void> {
    using server = TestServer.start();
    const clientInstance = HeadersErrorsRunners.createClient(scenarioCase.input.clientConfig?.headers, server.url);
    const { request } = scenarioCase.input;
    const { expected } = scenarioCase;

    if (request.acceptValues !== undefined) {
      for (let index = 0; index < request.acceptValues.length; index += 1) {
        const response = await clientInstance.get(request.path, { 'headers': { 'Accept': request.acceptValues[index] ?? '' } });
        assert.strictEqual(response.status, expected.status);
      }
      return;
    }

    const response = await HeadersErrorsRunners.send(clientInstance, request);
    assert.strictEqual(response.status, expected.status);
  }

  static 'rejects-construction'(scenarioCase: ScenarioCaseOfType<HeadersErrorsScenarioCaseEntity.Type, 'rejects-construction'>): void {
    using server = TestServer.start();
    const clientConfig = HeadersErrorsRunners.createClientConfig(scenarioCase.input.clientConfig?.headers, server.url);
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidClientFactory.create(clientConfig);
      return created;
    });
    assert.ok(caught instanceof Error);
    HeadersErrorsRunners.assertMessageIncludes(caught, scenarioCase.expected.messageIncludes);
  }

  static async 'rejects-request'(scenarioCase: ScenarioCaseOfType<HeadersErrorsScenarioCaseEntity.Type, 'rejects-request'>): Promise<void> {
    using server = TestServer.start();
    const clientInstance = HeadersErrorsRunners.createClient(scenarioCase.input.clientConfig?.headers, server.url);
    const { request } = scenarioCase.input;
    const { expected } = scenarioCase;

    const caught = await RejectionProbe.capture(async () => {
      if (request.acceptValues !== undefined) {
        for (let index = 0; index < request.acceptValues.length; index += 1) {
          await clientInstance.get(request.path, { 'headers': { 'Accept': request.acceptValues[index] ?? '' } });
        }
        return;
      }
      await HeadersErrorsRunners.send(clientInstance, request);
    });
    assert.ok(caught instanceof Error);
    if (expected.errorType === 'TypeError') {
      assert.ok(caught instanceof RequestFailedError);
      const cause: unknown = caught.cause;
      assert.ok(cause instanceof TypeError);
    }
    HeadersErrorsRunners.assertMessageIncludes(caught, expected.messageIncludes);
  }

  private static assertMessageIncludes(error: Error, parts: readonly string[] | undefined): void {
    const expectedParts = parts ?? [];
    for (let index = 0; index < expectedParts.length; index += 1) {
      assert.ok(error.message.toLowerCase().includes((expectedParts[index] ?? '').toLowerCase()));
    }
  }

  private static createClient(headers: BoundedJsonValueEntity.Type | undefined, serverUrl: string): FetchClient {
    const config = HeadersErrorsRunners.createClientConfig(headers, serverUrl);
    const created = InvalidClientFactory.create(config);
    return created;
  }

  private static createClientConfig(headers: BoundedJsonValueEntity.Type | undefined, serverUrl: string): { 'baseURL': string; 'headers'?: unknown } {
    const config = {
      'baseURL': serverUrl,
      ...(headers === undefined ? {} : { 'headers': RuntimeValueMaterializer.materialize(headers) })
    };
    return config;
  }

  private static async send(clientInstance: FetchClient, request: ScenarioCaseOfType<HeadersErrorsScenarioCaseEntity.Type, 'ok'>['input']['request']): Promise<Response> {
    const { headers } = request;
    const options = {
      ...(headers === undefined ? {} : { 'headers': headers }),
      ...(request.body === undefined ? {} : { 'body': RuntimeValueMaterializer.materialize(request.body) })
    };
    const response = request.method === 'GET'
      ? await clientInstance.get(request.path, headers === undefined ? undefined : { 'headers': headers })
      : await clientInstance.post(request.path, options);
    return response;
  }
}

ScenarioSuite.register({
  'entity': HeadersErrorsScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Headers Error Scenarios',
  'runners': HeadersErrorsRunners
});
