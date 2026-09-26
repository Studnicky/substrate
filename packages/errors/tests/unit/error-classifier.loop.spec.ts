import { RuntimeError } from '../../src/errors/RuntimeError.js';
import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorClassifier } from '../../src/classifiers/ErrorClassifier.js';
import { ErrorClassifierScenarioCaseEntity } from './entities/ErrorClassifierScenarioCaseEntity.js';
import scenarioGroups from './error-classifier.scenarios.json' with { type: 'json' };

class TestClassifier extends ErrorClassifier {
  public constructor() {
    super();
  }

  public classify(): never {
    throw RuntimeError.create('not used');
  }

  public messageContainsPublic(error: Error, ...patterns: string[]): boolean {
    return this.messageContains(error, ...patterns);
  }

  public nonRetryablePublic(reason: string): { reason?: string; retryable: boolean } {
    return this.nonRetryable(reason);
  }

  public retryablePublic(reason: string): { reason?: string; retryable: boolean } {
    return this.retryable(reason);
  }
}

type ScenarioCase = ErrorClassifierScenarioCaseEntity.Type;
type ScenarioRunner = (scenario: ScenarioCase, classifier: TestClassifier) => void;

const fileIntake = ScenarioFileCompiler.compileIntake(ErrorClassifierScenarioCaseEntity.Schema, ErrorClassifierScenarioCaseEntity.Node);

const runMessageContains: ScenarioRunner = (scenario, classifier) => {
  assert.strictEqual(classifier.messageContainsPublic(RuntimeError.create(scenario.input.message), ...(scenario.input.patterns ?? [])), scenario.expected.value);
};

const runnerMap = {
  'classifications': (scenario, classifier) => {
    assert.deepStrictEqual(classifier.retryablePublic('x'), { reason: 'x', retryable: scenario.expected.retryable });
    assert.deepStrictEqual(classifier.nonRetryablePublic('y'), { reason: 'y', retryable: scenario.expected.nonRetryable });
  },
  'message-contains-hit': runMessageContains,
  'message-contains-miss': runMessageContains
} satisfies Record<ScenarioCase['shape'], ScenarioRunner>;

function runCase(scenario: ScenarioCase): void {
  runnerMap[scenario.shape](scenario, new TestClassifier());
}

void describe('ErrorClassifier', () => {
  for (const scenario of fileIntake(scenarioGroups).cases) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
