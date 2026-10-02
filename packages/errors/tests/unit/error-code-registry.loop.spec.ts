import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { ErrorCodeRegistry } from '../../src/errors/ErrorCodeRegistry.js';
import { ErrorCodeRegistryScenarioCaseEntity } from './entities/ErrorCodeRegistryScenarioCaseEntity.js';
import scenarioGroups from './error-code-registry.scenarios.json' with { 'type': 'json' };

class ErrorCodeRegistryRunners {
  static 'constructor-throws'(scenarioCase: ScenarioCaseOfType<ErrorCodeRegistryScenarioCaseEntity.Type, 'constructor-throws'>): void {
    assert.throws(() => {
      const instance: unknown = Reflect.construct(ErrorCodeRegistry, []);
      return instance;
    }, (error) => {
      assert.ok(error instanceof Error);
      assert.strictEqual(error.message, String(scenarioCase.expected.message));
      return true;
    });
  }

  static 'register-duplicate'(scenarioCase: ScenarioCaseOfType<ErrorCodeRegistryScenarioCaseEntity.Type, 'register-duplicate'>): void {
    const descriptor = ScenarioValues.requireDefined(scenarioCase.input.descriptor, 'Scenario input.descriptor');
    assert.doesNotThrow(() => {
      ErrorCodeRegistry.register(descriptor);
    });
    assert.throws(() => {
      ErrorCodeRegistry.register(descriptor);
    }, (error) => {
      assert.ok(error instanceof Error);
      assert.ok(error.message.includes(String(scenarioCase.expected.messageIncludes)));
      return true;
    });
  }

  static 'register-unique'(scenarioCase: ScenarioCaseOfType<ErrorCodeRegistryScenarioCaseEntity.Type, 'register-unique'>): void {
    const descriptor = ScenarioValues.requireDefined(scenarioCase.input.descriptor, 'Scenario input.descriptor');
    if (scenarioCase.expected.registered === true) {
      assert.doesNotThrow(() => {
        ErrorCodeRegistry.register(descriptor);
      });
    } else {
      assert.throws(() => {
        ErrorCodeRegistry.register(descriptor);
      });
    }
  }
}

ScenarioSuite.register({
  'entity': ErrorCodeRegistryScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'ErrorCodeRegistry',
  'runners': ErrorCodeRegistryRunners
});
