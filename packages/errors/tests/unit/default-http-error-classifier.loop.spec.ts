import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { DefaultHttpErrorClassifier } from '../../src/classifiers/DefaultHttpErrorClassifier.js';
import { ErrorWithStatusEntity } from '../../src/entities/ErrorWithStatusEntity.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import scenarioGroups from './default-http-error-classifier.scenarios.json' with { 'type': 'json' };
import { DefaultHttpErrorClassifierScenarioCaseEntity } from './entities/DefaultHttpErrorClassifierScenarioCaseEntity.js';

class DefaultHttpErrorClassifierRunners {
  static 'client-error'(scenarioCase: ScenarioCaseOfType<DefaultHttpErrorClassifierScenarioCaseEntity.Type, 'client-error'>): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'gateway-error'(scenarioCase: ScenarioCaseOfType<DefaultHttpErrorClassifierScenarioCaseEntity.Type, 'gateway-error'>): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'network-code'(scenarioCase: ScenarioCaseOfType<DefaultHttpErrorClassifierScenarioCaseEntity.Type, 'network-code'>): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'network-message'(scenarioCase: ScenarioCaseOfType<DefaultHttpErrorClassifierScenarioCaseEntity.Type, 'network-message'>): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'rate-limited'(scenarioCase: ScenarioCaseOfType<DefaultHttpErrorClassifierScenarioCaseEntity.Type, 'rate-limited'>): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'request-timeout'(scenarioCase: ScenarioCaseOfType<DefaultHttpErrorClassifierScenarioCaseEntity.Type, 'request-timeout'>): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'server-error'(scenarioCase: ScenarioCaseOfType<DefaultHttpErrorClassifierScenarioCaseEntity.Type, 'server-error'>): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'unknown-early'(scenarioCase: ScenarioCaseOfType<DefaultHttpErrorClassifierScenarioCaseEntity.Type, 'unknown-early'>): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'unknown-late'(scenarioCase: ScenarioCaseOfType<DefaultHttpErrorClassifierScenarioCaseEntity.Type, 'unknown-late'>): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  private static classify(scenarioCase: DefaultHttpErrorClassifierScenarioCaseEntity.Type): void {
    const classifier = DefaultHttpErrorClassifier.create();
    const error = DefaultHttpErrorClassifierRunners.createError(scenarioCase.input);
    const classification = classifier.classify(error, scenarioCase.attemptNumber);

    assert.deepStrictEqual(classification, scenarioCase.expected);
    assert.strictEqual(ErrorWithStatusEntity.validate(error), 'status' in scenarioCase.input);
  }

  private static createError(input: DefaultHttpErrorClassifierScenarioCaseEntity.Type['input']): Error {
    const error = RuntimeError.create(input.message ?? '');
    Object.assign(error, input);
    return error;
  }
}

ScenarioSuite.register({
  'entity': DefaultHttpErrorClassifierScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'DefaultHttpErrorClassifier',
  'runners': DefaultHttpErrorClassifierRunners
});
