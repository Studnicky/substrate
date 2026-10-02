import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { FetchClient } from '../../../src/node/index.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import { StandaloneScenarioCaseEntity } from './entities/StandaloneScenarioCaseEntity.js';
import scenarioGroups from './standalone.scenarios.json' with { 'type': 'json' };

class StandaloneRunners {
  private static readonly client = FetchClient.create();

  static async 'DELETE'(scenarioCase: ScenarioCaseOfType<StandaloneScenarioCaseEntity.Type, 'DELETE'>): Promise<void> {
    using server = TestServer.start();
    const url = `${server.url}${scenarioCase.input.path}`;
    const response = await StandaloneRunners.client.delete(url);
    await StandaloneRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'GET'(scenarioCase: ScenarioCaseOfType<StandaloneScenarioCaseEntity.Type, 'GET'>): Promise<void> {
    using server = TestServer.start();
    const url = `${server.url}${scenarioCase.input.path}`;
    const response = await StandaloneRunners.client.get(url);
    await StandaloneRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'HEAD'(scenarioCase: ScenarioCaseOfType<StandaloneScenarioCaseEntity.Type, 'HEAD'>): Promise<void> {
    using server = TestServer.start();
    const url = `${server.url}${scenarioCase.input.path}`;
    const response = await StandaloneRunners.client.head(url);
    await StandaloneRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'OPTIONS'(scenarioCase: ScenarioCaseOfType<StandaloneScenarioCaseEntity.Type, 'OPTIONS'>): Promise<void> {
    using server = TestServer.start();
    const url = `${server.url}${scenarioCase.input.path}`;
    const response = await StandaloneRunners.client.options(url);
    await StandaloneRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'PATCH'(scenarioCase: ScenarioCaseOfType<StandaloneScenarioCaseEntity.Type, 'PATCH'>): Promise<void> {
    using server = TestServer.start();
    const url = `${server.url}${scenarioCase.input.path}`;
    const { body } = scenarioCase.input;
    const response = await StandaloneRunners.client.patch(url, body === undefined ? undefined : { 'body': body });
    await StandaloneRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'POST'(scenarioCase: ScenarioCaseOfType<StandaloneScenarioCaseEntity.Type, 'POST'>): Promise<void> {
    using server = TestServer.start();
    const url = `${server.url}${scenarioCase.input.path}`;
    const { body } = scenarioCase.input;
    const response = await StandaloneRunners.client.post(url, body === undefined ? undefined : { 'body': body });
    await StandaloneRunners.assertResponse(response, scenarioCase.expected);
  }

  static async 'PUT'(scenarioCase: ScenarioCaseOfType<StandaloneScenarioCaseEntity.Type, 'PUT'>): Promise<void> {
    using server = TestServer.start();
    const url = `${server.url}${scenarioCase.input.path}`;
    const { body } = scenarioCase.input;
    const response = await StandaloneRunners.client.put(url, body === undefined ? undefined : { 'body': body });
    await StandaloneRunners.assertResponse(response, scenarioCase.expected);
  }

  private static async assertResponse(response: Response, expected: StandaloneScenarioCaseEntity.Type['expected']): Promise<void> {
    assert.strictEqual(response.status, expected.status);

    if (expected.shape === 'ok') {
      if (expected.text !== undefined) {
        assert.strictEqual(await response.text(), expected.text);
      }
      return;
    }

    const data = ScenarioValues.requireRecord(await response.json(), 'response body');
    if (expected.id !== undefined) {
      assert.strictEqual(data.id, expected.id);
    }
    if (expected.title !== undefined) {
      assert.strictEqual(data.title, expected.title);
    }
  }
}

ScenarioSuite.register({
  'entity': StandaloneScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'FetchClient HTTP methods with absolute URLs',
  'runners': StandaloneRunners
});
