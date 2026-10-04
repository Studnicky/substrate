import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { FetchClient, TimeoutError } from '../../../src/node/index.js';
import { RejectionProbe } from '../../helpers/RejectionProbe.js';
import { TestServer } from '../../helpers/test-server/TestServer.js';
import { TimeoutScenarioCaseEntity } from './entities/TimeoutScenarioCaseEntity.js';
import scenarioGroups from './timeout.scenarios.json' with { 'type': 'json' };

class TimeoutRunners {
  private static readonly client = FetchClient.create();

  static async 'applies-default-timeout'(scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'applies-default-timeout'>): Promise<void> {
    using server = TestServer.start();
    const clientWithDefault = FetchClient.create({ 'timeout': scenarioCase.input.clientTimeout });
    const response = await clientWithDefault.get(`${server.url}${scenarioCase.input.request.url}`);
    assert.strictEqual(response.status, scenarioCase.expected.status);
  }

  static async 'clears-timeout-after-success'(scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'clears-timeout-after-success'>): Promise<void> {
    using server = TestServer.start();
    const response = await TimeoutRunners.client.get(`${server.url}${scenarioCase.input.request.url}`, { 'timeout': scenarioCase.input.request.timeout });
    assert.strictEqual(response.status, scenarioCase.expected.status);
  }

  static async 'completes-without-timeout'(scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'completes-without-timeout'>): Promise<void> {
    using server = TestServer.start();
    const response = await TimeoutRunners.client.get(`${server.url}${scenarioCase.input.request.url}`);
    assert.strictEqual(response.status, scenarioCase.expected.status);
  }

  static async 'reports-timeout-details'(scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'reports-timeout-details'>): Promise<void> {
    using server = TestServer.start();
    const caught = await RejectionProbe.capture(async () => {
      await TimeoutRunners.client.get(`${server.url}${scenarioCase.input.request.url}`, { 'timeout': scenarioCase.input.request.timeout });
    });
    assert.ok(caught instanceof TimeoutError);
    assert.strictEqual(caught.timeoutMs, scenarioCase.expected.timeoutMs);
    assert.ok(caught.url.includes(scenarioCase.expected.urlIncludes));
  }

  static async 'request-overrides-default-timeout'(scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'request-overrides-default-timeout'>): Promise<void> {
    using server = TestServer.start();
    const clientWithDefault = FetchClient.create({ 'timeout': scenarioCase.input.clientTimeout });
    const response = await clientWithDefault.get(`${server.url}${scenarioCase.input.request.url}`, { 'timeout': scenarioCase.input.request.timeout });
    assert.strictEqual(response.status, scenarioCase.expected.status);
  }

  static async 'supports-timeout-in-get'(scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'supports-timeout-in-get'>): Promise<void> {
    using server = TestServer.start();
    const caught = await RejectionProbe.capture(async () => {
      await TimeoutRunners.client.get(`${server.url}${scenarioCase.input.request.url}`, { 'timeout': scenarioCase.input.request.timeout });
    });
    assert.ok(caught instanceof TimeoutError);
    assert.equal(caught.name, scenarioCase.expected.errorName);
  }

  static async 'times-out-fast-request'(scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'times-out-fast-request'>): Promise<void> {
    using server = TestServer.start();
    const requestUrl = scenarioCase.input.request.url.replace('__TEST_URL__', server.url);
    const caught = await RejectionProbe.capture(async () => {
      await TimeoutRunners.client.get(requestUrl, { 'timeout': scenarioCase.input.request.timeout });
    });
    assert.ok(caught instanceof TimeoutError);
    assert.equal(caught.name, scenarioCase.expected.errorName);
  }

  static async 'works-with-fast-requests'(scenarioCase: ScenarioCaseOfType<TimeoutScenarioCaseEntity.Type, 'works-with-fast-requests'>): Promise<void> {
    using server = TestServer.start();
    const response = await TimeoutRunners.client.get(`${server.url}${scenarioCase.input.request.url}`, { 'timeout': scenarioCase.input.request.timeout });
    assert.strictEqual(response.status, scenarioCase.expected.status);
  }
}

ScenarioSuite.register({
  'entity': TimeoutScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Timeout Feature',
  'runners': TimeoutRunners
});
