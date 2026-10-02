import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { DispatcherAgent } from '../../src/config/DispatcherAgent.js';
import { DEFAULT_DISPATCHER_CONFIG } from '../../src/constants/DEFAULT_DISPATCHER_CONFIG.js';
import { ClientConfigDataEntity } from '../../src/entities/ClientConfigDataEntity.js';
import { FetchClient } from '../../src/modules/FetchClient.js';
import { UndiciDispatcher } from '../../src/modules/UndiciDispatcher.js';
import { InvalidClientFactory } from '../helpers/InvalidClientFactory.js';
import { RejectionProbe } from '../helpers/RejectionProbe.js';
import { UndiciConfigMergeScenarioCaseEntity } from './entities/UndiciConfigMergeScenarioCaseEntity.js';
import scenarioGroups from './undici-config-merge.scenarios.json' with { 'type': 'json' };

class UndiciConfigMergeRunners {
  static 'client-created'(scenarioCase: ScenarioCaseOfType<UndiciConfigMergeScenarioCaseEntity.Type, 'client-created'>): void {
    const created = InvalidClientFactory.create(scenarioCase.input.fetchClient);
    assert.ok(created instanceof FetchClient);
  }

  static 'client-rejected'(scenarioCase: ScenarioCaseOfType<UndiciConfigMergeScenarioCaseEntity.Type, 'client-rejected'>): void {
    assert.ok(scenarioCase.expected.messageIncludes !== undefined);
    const caught = RejectionProbe.captureSync(() => {
      const created = InvalidClientFactory.create(scenarioCase.input.fetchClient);
      return created;
    });
    assert.ok(caught instanceof Error);
    assert.ok(caught.message.length > 0);
  }

  static 'defaults'(scenarioCase: ScenarioCaseOfType<UndiciConfigMergeScenarioCaseEntity.Type, 'defaults'>): void {
    const pairs = Object.entries(scenarioCase.expected.values);
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index] ?? ['', null];
      assert.strictEqual(Reflect.get(DEFAULT_DISPATCHER_CONFIG, pair[0]), pair[1], pair[0]);
    }
  }

  static 'dispatcher-created'(scenarioCase: ScenarioCaseOfType<UndiciConfigMergeScenarioCaseEntity.Type, 'dispatcher-created'>): void {
    const dispatcher = UndiciConfigMergeRunners.createDispatcher(scenarioCase.input.dispatcher);
    assert.ok(dispatcher instanceof UndiciDispatcher);
  }

  static 'dispatcher-rejected'(scenarioCase: ScenarioCaseOfType<UndiciConfigMergeScenarioCaseEntity.Type, 'dispatcher-rejected'>): void {
    assert.ok(scenarioCase.expected.messageIncludes !== undefined);
    const caught = RejectionProbe.captureSync(() => {
      const dispatcher = UndiciConfigMergeRunners.createDispatcher(scenarioCase.input.dispatcher);
      return dispatcher;
    });
    assert.ok(caught instanceof Error);
    assert.ok(caught.message.length > 0);
  }

  private static createDispatcher(config: object): UndiciDispatcher {
    const clientConfig = ClientConfigDataEntity.intake({ 'dispatcher': config });
    const dispatcherConfig = clientConfig.dispatcher;
    assert.ok(dispatcherConfig !== undefined, 'dispatcher config must be present');
    const agent = DispatcherAgent.create(dispatcherConfig);
    const dispatcher = UndiciDispatcher.create(agent);
    return dispatcher;
  }
}

ScenarioSuite.register({
  'entity': UndiciConfigMergeScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'pool configuration validation and merging',
  'runners': UndiciConfigMergeRunners
});
