import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { FetchClient } from '../../../src/node/index.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import scenarioGroups from './client.scenarios.json' with { 'type': 'json' };
import { ClientScenarioCaseEntity } from './entities/ClientScenarioCaseEntity.js';

class ClientRunners {
  static async 'DELETE'(scenarioCase: ScenarioCaseOfType<ClientScenarioCaseEntity.Type, 'DELETE'>): Promise<void> {
    using server = TestServer.start();
    const client = FetchClient.create({ 'baseURL': server.url });
    const response = await client.delete(scenarioCase.input.path);
    await ClientRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'GET'(scenarioCase: ScenarioCaseOfType<ClientScenarioCaseEntity.Type, 'GET'>): Promise<void> {
    using server = TestServer.start();
    const client = FetchClient.create({ 'baseURL': server.url });
    const response = await client.get(scenarioCase.input.path);
    await ClientRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'HEAD'(scenarioCase: ScenarioCaseOfType<ClientScenarioCaseEntity.Type, 'HEAD'>): Promise<void> {
    using server = TestServer.start();
    const client = FetchClient.create({ 'baseURL': server.url });
    const response = await client.head(scenarioCase.input.path);
    await ClientRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'OPTIONS'(scenarioCase: ScenarioCaseOfType<ClientScenarioCaseEntity.Type, 'OPTIONS'>): Promise<void> {
    using server = TestServer.start();
    const client = FetchClient.create({ 'baseURL': server.url });
    const response = await client.options(scenarioCase.input.path);
    await ClientRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'PATCH'(scenarioCase: ScenarioCaseOfType<ClientScenarioCaseEntity.Type, 'PATCH'>): Promise<void> {
    using server = TestServer.start();
    const client = FetchClient.create({ 'baseURL': server.url });
    const { body } = scenarioCase.input;
    const response = await client.patch(scenarioCase.input.path, body === undefined ? undefined : { 'body': body });
    await ClientRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'POST'(scenarioCase: ScenarioCaseOfType<ClientScenarioCaseEntity.Type, 'POST'>): Promise<void> {
    using server = TestServer.start();
    const client = FetchClient.create({ 'baseURL': server.url });
    const { body } = scenarioCase.input;
    const response = await client.post(scenarioCase.input.path, body === undefined ? undefined : { 'body': body });
    await ClientRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'PUT'(scenarioCase: ScenarioCaseOfType<ClientScenarioCaseEntity.Type, 'PUT'>): Promise<void> {
    using server = TestServer.start();
    const client = FetchClient.create({ 'baseURL': server.url });
    const { body } = scenarioCase.input;
    const response = await client.put(scenarioCase.input.path, body === undefined ? undefined : { 'body': body });
    await ClientRunners.assertResponse(response, scenarioCase.expected);
  }

  private static async assertResponse(response: Response, expected: ClientScenarioCaseEntity.Type['expected']): Promise<void> {
    assert.strictEqual(response.status, expected.status);

    if (expected.json !== undefined) {
      assert.deepStrictEqual(await response.json(), expected.json);
    }
  }
}

ScenarioSuite.register({
  'entity': ClientScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FetchClient HTTP Methods',
  'runners': ClientRunners
});
