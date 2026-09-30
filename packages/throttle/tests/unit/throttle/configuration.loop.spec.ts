import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ConfigurationError } from '@studnicky/config/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { it } from 'node:test';

import { ThrottleConfigEntity } from '../../../src/entities/ThrottleConfigEntity.js';
import { Throttle } from '../../../src/throttle/index.js';
import scenarioGroups from './configuration.scenarios.json' with { 'type': 'json' };
import { ConfigurationScenarioCaseEntity } from './entities/ConfigurationScenarioCaseEntity.js';

class ConfigurationRunners {
  static 'accepts-valid-configuration'(scenarioCase: ScenarioCaseOfType<ConfigurationScenarioCaseEntity.Type, 'accepts-valid-configuration'>): void {
    assert.doesNotThrow(() => { Throttle.create(ConfigurationRunners.resolveThrottleConfig(scenarioCase.input.throttle)); });
    assert.doesNotThrow(() => { Throttle.create(); });
    assert.equal(scenarioCase.expected.accepted, true);
    assert.equal(scenarioCase.expected.defaultAccepted, true);
  }

  static 'custom-concurrency-limit'(scenarioCase: ScenarioCaseOfType<ConfigurationScenarioCaseEntity.Type, 'custom-concurrency-limit'>): void {
    const throttle = Throttle.create(ConfigurationRunners.resolveThrottleConfig(scenarioCase.input.throttle));
    assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
  }

  static 'default-config'(scenarioCase: ScenarioCaseOfType<ConfigurationScenarioCaseEntity.Type, 'default-config'>): void {
    const throttle = Throttle.create();
    assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
    assert.deepStrictEqual(scenarioCase.input.throttle, {});
  }

  static 'invalid-concurrency-limit'(scenarioCase: ScenarioCaseOfType<ConfigurationScenarioCaseEntity.Type, 'invalid-concurrency-limit'>): void {
    assert.throws(() => { Throttle.create(ConfigurationRunners.resolveThrottleConfig(scenarioCase.input.throttle)); }, ConfigurationError);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  }

  static 'invalid-concurrency-limit-nan'(scenarioCase: ScenarioCaseOfType<ConfigurationScenarioCaseEntity.Type, 'invalid-concurrency-limit-nan'>): void {
    assert.strictEqual(scenarioCase.input.throttle.concurrencyLimit, 'NaN');
    assert.throws(() => { Throttle.create(ConfigurationRunners.resolveThrottleConfig(scenarioCase.input.throttle)); }, ConfigurationError);
    assert.equal(scenarioCase.expected.errorName, 'ConfigurationError');
  }

  static 'missing-concurrency-limit-uses-default'(scenarioCase: ScenarioCaseOfType<ConfigurationScenarioCaseEntity.Type, 'missing-concurrency-limit-uses-default'>): void {
    const throttle = Throttle.create(ConfigurationRunners.resolveThrottleConfig(scenarioCase.input.throttle));
    assert.strictEqual(throttle.getStats().concurrencyLimit, scenarioCase.expected.concurrencyLimit);
  }

  private static resolveThrottleConfig(config: ConfigurationScenarioCaseEntity.Type['input']['throttle']): Parameters<typeof Throttle.create>[0] {
    let resolved: Parameters<typeof Throttle.create>[0] = {};
    if (config.concurrencyLimit === 'NaN') {
      resolved = { 'concurrencyLimit': Number.NaN };
    }
    if (typeof config.concurrencyLimit === 'number') {
      resolved = { 'concurrencyLimit': config.concurrencyLimit };
    }
    return resolved;
  }

  static declaresEntityConfigContract(): void {
    void it('defaults only undefined configuration and rejects null through entity intake', () => {
      assert.doesNotThrow(() => { Throttle.create(undefined); });
      assert.strictEqual(ThrottleConfigEntity.validate(null), false);
    });
  }
}

ScenarioSuite.register({
  'entity': ConfigurationScenarioCaseEntity,
  'extraTests': ConfigurationRunners.declaresEntityConfigContract,
  'file': scenarioGroups,
  'name': 'Throttle configuration',
  'runners': ConfigurationRunners
});
