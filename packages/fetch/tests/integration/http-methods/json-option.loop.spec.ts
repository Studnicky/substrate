import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { FetchClient } from '../../../src/node/index.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import { JsonOptionScenarioCaseEntity } from './entities/JsonOptionScenarioCaseEntity.js';
import scenarioGroups from './json-option.scenarios.json' with { 'type': 'json' };

class JsonOptionRunners {
  static async 'PATCH'(scenarioCase: ScenarioCaseOfType<JsonOptionScenarioCaseEntity.Type, 'PATCH'>): Promise<void> {
    using server = TestServer.start();
    const client = JsonOptionRunners.createClient(scenarioCase.client, server.url);
    const url = JsonOptionRunners.resolveUrl(scenarioCase, server.url);
    const response = await client.patch(url, JsonOptionRunners.createOptions(scenarioCase.input));
    await JsonOptionRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'POST'(scenarioCase: ScenarioCaseOfType<JsonOptionScenarioCaseEntity.Type, 'POST'>): Promise<void> {
    using server = TestServer.start();
    const client = JsonOptionRunners.createClient(scenarioCase.client, server.url);
    const url = JsonOptionRunners.resolveUrl(scenarioCase, server.url);
    const response = await client.post(url, JsonOptionRunners.createOptions(scenarioCase.input));
    await JsonOptionRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'PUT'(scenarioCase: ScenarioCaseOfType<JsonOptionScenarioCaseEntity.Type, 'PUT'>): Promise<void> {
    using server = TestServer.start();
    const client = JsonOptionRunners.createClient(scenarioCase.client, server.url);
    const url = JsonOptionRunners.resolveUrl(scenarioCase, server.url);
    const response = await client.put(url, JsonOptionRunners.createOptions(scenarioCase.input));
    await JsonOptionRunners.assertResponse(response, scenarioCase.expected);
  }

  private static async assertResponse(response: Response, expected: JsonOptionScenarioCaseEntity.Type['expected']): Promise<void> {
    assert.strictEqual(response.status, expected.status);

    if ('body' in expected) {
      const echo = ScenarioValues.requireRecord(await response.json(), 'echo response');
      const headers = ScenarioValues.requireRecord(ScenarioValues.requireProperty(echo, 'headers', 'echo response'), 'echo response headers');
      assert.deepStrictEqual(ScenarioValues.requireProperty(echo, 'body', 'echo response'), expected.body);
      if (expected.headerContentType !== undefined) {
        assert.strictEqual(String(headers['content-type']), expected.headerContentType);
      }
      return;
    }

    assert.deepStrictEqual(await response.json(), expected.json);
  }

  private static createClient(clientKind: JsonOptionScenarioCaseEntity.Type['client'], serverUrl: string): FetchClient {
    const client = clientKind === 'absolute' ? FetchClient.create() : FetchClient.create({ 'baseURL': serverUrl });
    return client;
  }

  private static createOptions(input: JsonOptionScenarioCaseEntity.Type['input']): { 'body'?: typeof input.body; 'json'?: typeof input.json } {
    const options = {
      ...(input.body === undefined ? {} : { 'body': input.body }),
      ...(input.json === undefined ? {} : { 'json': input.json })
    };
    return options;
  }

  private static resolveUrl(scenarioCase: JsonOptionScenarioCaseEntity.Type, serverUrl: string): string {
    const { baseURL } = scenarioCase.input;
    const resolvedBase = baseURL === '__TEST_SERVER_URL__' ? serverUrl : baseURL;
    const url = scenarioCase.client === 'absolute' ? `${resolvedBase}${scenarioCase.input.path}` : scenarioCase.input.path;
    return url;
  }
}

ScenarioSuite.register({
  'entity': JsonOptionScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'json option',
  'runners': JsonOptionRunners
});
