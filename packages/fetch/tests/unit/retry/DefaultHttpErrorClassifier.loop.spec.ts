import { ErrorWithStatusEntity } from '@studnicky/errors/entities';
import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import {
  ScenarioFileCompiler,
  ScenarioSuite
} from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { DefaultHttpErrorClassifier } from '../../../src/retry/index.js';
import scenarioGroups from './default-http-error-classifier.scenarios.json' with { 'type': 'json' };
import { DefaultHttpErrorClassifierScenarioCaseEntity } from './entities/DefaultHttpErrorClassifierScenarioCaseEntity.js';

class DefaultHttpErrorClassifierRunners {
  static 'client-error'(
    scenarioCase: ScenarioCaseOfType<
      DefaultHttpErrorClassifierScenarioCaseEntity.Type,
      'client-error'
    >
  ): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'gateway-error'(
    scenarioCase: ScenarioCaseOfType<
      DefaultHttpErrorClassifierScenarioCaseEntity.Type,
      'gateway-error'
    >
  ): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'network-code'(
    scenarioCase: ScenarioCaseOfType<
      DefaultHttpErrorClassifierScenarioCaseEntity.Type,
      'network-code'
    >
  ): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'network-message'(
    scenarioCase: ScenarioCaseOfType<
      DefaultHttpErrorClassifierScenarioCaseEntity.Type,
      'network-message'
    >
  ): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'rate-limited'(
    scenarioCase: ScenarioCaseOfType<
      DefaultHttpErrorClassifierScenarioCaseEntity.Type,
      'rate-limited'
    >
  ): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'request-timeout'(
    scenarioCase: ScenarioCaseOfType<
      DefaultHttpErrorClassifierScenarioCaseEntity.Type,
      'request-timeout'
    >
  ): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'server-error'(
    scenarioCase: ScenarioCaseOfType<
      DefaultHttpErrorClassifierScenarioCaseEntity.Type,
      'server-error'
    >
  ): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'unknown-early'(
    scenarioCase: ScenarioCaseOfType<
      DefaultHttpErrorClassifierScenarioCaseEntity.Type,
      'unknown-early'
    >
  ): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  static 'unknown-late'(
    scenarioCase: ScenarioCaseOfType<
      DefaultHttpErrorClassifierScenarioCaseEntity.Type,
      'unknown-late'
    >
  ): void {
    DefaultHttpErrorClassifierRunners.classify(scenarioCase);
  }

  private static classify(scenarioCase: DefaultHttpErrorClassifierScenarioCaseEntity.Type): void {
    const classifier = DefaultHttpErrorClassifier.create();
    const error = DefaultHttpErrorClassifierRunners.createError(scenarioCase.input);
    const classification = classifier.classify(error, scenarioCase.attemptNumber);

    assert.deepStrictEqual(classification, scenarioCase.expected);
    assert.strictEqual(ErrorWithStatusEntity.validate(error), 'status' in scenarioCase.input);
  }

  private static createError(
    input: DefaultHttpErrorClassifierScenarioCaseEntity.Type['input']
  ): Error {
    const error = RuntimeError.create(input.message ?? '');
    Object.assign(error, input);
    return error;
  }
}

const scenarioFile = ScenarioFileCompiler.compileIntake(
  DefaultHttpErrorClassifierScenarioCaseEntity
)(scenarioGroups);

ScenarioSuite.register({
  'entity': DefaultHttpErrorClassifierScenarioCaseEntity,
  'file': scenarioFile,
  'name': 'DefaultHttpErrorClassifier',
  'runners': DefaultHttpErrorClassifierRunners
});
