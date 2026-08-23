import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ErrorClassifier } from '../../src/classifiers/ErrorClassifier.js';
import scenarioGroups from './error-classifier.scenarios.json' with { type: 'json' };

class TestClassifier extends ErrorClassifier {
  public constructor() {
    super();
  }

  public classify(): never {
    throw new Error('not used');
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

type MessageScenarioShape = 'message-contains-hit' | 'message-contains-miss';

type MessageScenarioCase<S extends MessageScenarioShape = MessageScenarioShape> = {
  description: string;
  expected: { value: boolean };
  input: { message: string; patterns?: string[] };
  shape: S;
  name: string;
};

type ClassificationScenarioCase = {
  description: string;
  expected: { nonRetryable: boolean; retryable: boolean };
  input: { message: string };
  shape: 'classifications';
  name: string;
};

type ScenarioCase =
  | ClassificationScenarioCase
  | MessageScenarioCase<'message-contains-hit'>
  | MessageScenarioCase<'message-contains-miss'>;

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenario: Extract<ScenarioCase, { shape: K }>, classifier: TestClassifier) => void;
type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

const runMessageContains = (scenario: MessageScenarioCase, classifier: TestClassifier): void => {
  assert.strictEqual(classifier.messageContainsPublic(new Error(scenario.input.message), ...(scenario.input.patterns ?? [])), scenario.expected.value);
};

const runnerMap: RunnerMap = {
  'classifications': (scenario, classifier) => {
    assert.deepStrictEqual(classifier.retryablePublic('x'), { reason: 'x', retryable: scenario.expected.retryable });
    assert.deepStrictEqual(classifier.nonRetryablePublic('y'), { reason: 'y', retryable: scenario.expected.nonRetryable });
  },
  'message-contains-hit': runMessageContains,
  'message-contains-miss': runMessageContains
};

function runCase<K extends ScenarioCase['shape']>(scenario: Extract<ScenarioCase, { shape: K }>): void {
  runnerMap[scenario.shape](scenario, new TestClassifier());
}

function isScenarioCase(scenario: { shape: string }): scenario is ScenarioCase {
  return scenario.shape === 'classifications' || scenario.shape === 'message-contains-hit' || scenario.shape === 'message-contains-miss';
}

void describe('ErrorClassifier', () => {
  for (const scenario of scenarioGroups.cases as { name: string; shape: string }[]) {
    if (!isScenarioCase(scenario)) { continue; }
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
