import { RuntimeError } from '@studnicky/errors/node';
import { BaseError } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ConfigurationError } from '../../../src/errors/ConfigurationError.js';
import { ConfigurationErrorConstructionScenarioCaseEntity } from '../entities/ConfigurationErrorConstructionScenarioCaseEntity.js';
import { ConfigurationErrorDirectScenarioCaseEntity } from '../entities/ConfigurationErrorDirectScenarioCaseEntity.js';
import scenarioGroups from './ConfigurationError.scenarios.json' with { 'type': 'json' };

class ConfigurationErrorConstructionRunners {
  static 'base-error'(_scenarioCase: ScenarioCaseOfType<ConfigurationErrorConstructionScenarioCaseEntity.Type, 'base-error', 'outcome'>): void {
    const error = ConfigurationError.create('test');
    assert.ok(error instanceof BaseError);
  }

  static 'config.invalid'(_scenarioCase: ScenarioCaseOfType<ConfigurationErrorConstructionScenarioCaseEntity.Type, 'config.invalid', 'outcome'>): void {
    const error = ConfigurationError.create('test');
    assert.strictEqual(error.code, 'config.invalid');
  }

  static 'ConfigurationError'(_scenarioCase: ScenarioCaseOfType<ConfigurationErrorConstructionScenarioCaseEntity.Type, 'ConfigurationError', 'outcome'>): void {
    const error = ConfigurationError.create('test');
    assert.strictEqual(error.name, 'ConfigurationError');
  }

  static 'error'(_scenarioCase: ScenarioCaseOfType<ConfigurationErrorConstructionScenarioCaseEntity.Type, 'error', 'outcome'>): void {
    const error = ConfigurationError.create('test');
    assert.ok(error instanceof Error);
    assert.ok(error instanceof ConfigurationError);
  }

  static 'retryable-false'(_scenarioCase: ScenarioCaseOfType<ConfigurationErrorConstructionScenarioCaseEntity.Type, 'retryable-false', 'outcome'>): void {
    const error = ConfigurationError.create('test');
    assert.strictEqual(error.retryable, false);
  }

  static 'stack'(_scenarioCase: ScenarioCaseOfType<ConfigurationErrorConstructionScenarioCaseEntity.Type, 'stack', 'outcome'>): void {
    const error = ConfigurationError.create('test');
    assert.ok(typeof error.stack === 'string');
    assert.ok(error.stack.length > 0);
  }
}

class ConfigurationErrorDirectRunners {
  static 'cause'(scenarioCase: ScenarioCaseOfType<ConfigurationErrorDirectScenarioCaseEntity.Type, 'cause'>): void {
    const cause = RuntimeError.create(scenarioCase.causeMessage);
    const error = ConfigurationError.create(scenarioCase.message, cause);

    assert.strictEqual(error.message, scenarioCase.message);
    assert.strictEqual(error.cause, cause);
    assert.ok(error.cause instanceof Error);
    assert.strictEqual(error.cause.message, scenarioCase.outcome.causeMessage);
  }

  static 'json'(scenarioCase: ScenarioCaseOfType<ConfigurationErrorDirectScenarioCaseEntity.Type, 'json'>): void {
    const error = ConfigurationError.create(scenarioCase.message);
    const json = error.toJSON();

    assert.strictEqual(json.code, scenarioCase.outcome.code);
    // RFC 9457 3.1.4: the occurrence-specific message is `detail`.
    assert.strictEqual(json.detail, scenarioCase.outcome.message);
  }

  static 'message'(scenarioCase: ScenarioCaseOfType<ConfigurationErrorDirectScenarioCaseEntity.Type, 'message'>): void {
    const error = ConfigurationError.create(scenarioCase.message);

    assert.strictEqual(error.message, scenarioCase.outcome.message);
  }
}

ScenarioSuite.registerBy('outcome', {
  'entity': ConfigurationErrorConstructionScenarioCaseEntity,
  'file': { 'cases': scenarioGroups.construction },
  'name': 'ConfigurationError construction',
  'runners': ConfigurationErrorConstructionRunners
});

ScenarioSuite.register({
  'entity': ConfigurationErrorDirectScenarioCaseEntity,
  'file': { 'cases': scenarioGroups.direct },
  'name': 'ConfigurationError direct',
  'runners': ConfigurationErrorDirectRunners
});
