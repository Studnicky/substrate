import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';

import { ErrorClassifier } from '../../src/classifiers/ErrorClassifier.js';
import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ErrorClassifierScenarioCaseEntity } from './entities/ErrorClassifierScenarioCaseEntity.js';
import scenarioGroups from './error-classifier.scenarios.json' with { 'type': 'json' };

class TestClassifier extends ErrorClassifier {
  public constructor() {
    super();
  }

  public classify(): never {
    throw RuntimeError.create('not used');
  }

  public messageContainsPublic(error: Error, ...patterns: string[]): boolean {
    const result = this.messageContains(error, ...patterns);
    return result;
  }

  public nonRetryablePublic(reason: string): { 'reason'?: string; 'retryable': boolean } {
    const result = this.nonRetryable(reason);
    return result;
  }

  public retryablePublic(reason: string): { 'reason'?: string; 'retryable': boolean } {
    const result = this.retryable(reason);
    return result;
  }
}

class ErrorClassifierRunners {
  static 'classifications'(scenarioCase: ScenarioCaseOfType<ErrorClassifierScenarioCaseEntity.Type, 'classifications'>): void {
    const classifier = new TestClassifier();
    assert.deepStrictEqual(classifier.retryablePublic('x'), { 'reason': 'x', 'retryable': scenarioCase.expected.retryable });
    assert.deepStrictEqual(classifier.nonRetryablePublic('y'), { 'reason': 'y', 'retryable': scenarioCase.expected.nonRetryable });
  }

  static 'message-contains-hit'(scenarioCase: ScenarioCaseOfType<ErrorClassifierScenarioCaseEntity.Type, 'message-contains-hit'>): void {
    ErrorClassifierRunners.assertMessageContains(scenarioCase);
  }

  static 'message-contains-miss'(scenarioCase: ScenarioCaseOfType<ErrorClassifierScenarioCaseEntity.Type, 'message-contains-miss'>): void {
    ErrorClassifierRunners.assertMessageContains(scenarioCase);
  }

  private static assertMessageContains(scenarioCase: ErrorClassifierScenarioCaseEntity.Type): void {
    const classifier = new TestClassifier();
    assert.strictEqual(classifier.messageContainsPublic(RuntimeError.create(scenarioCase.input.message), ...(scenarioCase.input.patterns ?? [])), scenarioCase.expected.value);
  }
}

ScenarioSuite.register({
  'entity': ErrorClassifierScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'ErrorClassifier',
  'runners': ErrorClassifierRunners
});
