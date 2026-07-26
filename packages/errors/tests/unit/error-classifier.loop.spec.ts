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

  public hasPropertyPublic(error: Error, propertyName: string, matcher?: unknown): boolean {
    return this.hasProperty(error, propertyName, matcher as never);
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

type MatcherInput = { shape: 'accepted-statuses' | 'minimum-status' | 'status'; min?: number; value?: number; values?: number[] };
type PropertyScenarioShape = 'has-property-match-array' | 'has-property-match-predicate' | 'has-property-match-value' | 'has-property-missing' | 'has-property-mismatch-array' | 'has-property-mismatch-predicate' | 'has-property-mismatch-value' | 'has-property-present';
type MessageScenarioShape = 'message-contains-hit' | 'message-contains-miss';

type PropertyScenarioCase<S extends PropertyScenarioShape = PropertyScenarioShape> = {
  description: string;
  expected: { value: boolean };
  input: { matcher?: MatcherInput; message: string; propertyName?: string; status?: number };
  shape: S;
  name: string;
};

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
  | MessageScenarioCase<'message-contains-miss'>
  | PropertyScenarioCase<'has-property-match-array'>
  | PropertyScenarioCase<'has-property-match-predicate'>
  | PropertyScenarioCase<'has-property-match-value'>
  | PropertyScenarioCase<'has-property-missing'>
  | PropertyScenarioCase<'has-property-mismatch-array'>
  | PropertyScenarioCase<'has-property-mismatch-predicate'>
  | PropertyScenarioCase<'has-property-mismatch-value'>
  | PropertyScenarioCase<'has-property-present'>;

function createError(input: { message: string; status?: number }): Error {
  const error = new Error(input.message);
  if (input.status !== undefined) {
    Reflect.set(error, 'status', input.status);
  }
  return error;
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenario: Extract<ScenarioCase, { shape: K }>, classifier: TestClassifier, error: Error) => void;
type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

const matcherMap = {
  'accepted-statuses': (matcher: MatcherInput) => matcher.values ?? [],
  'minimum-status': (matcher: MatcherInput) => (value: number) => value >= Number(matcher.min),
  'status': (matcher: MatcherInput) => matcher.value
} satisfies Record<MatcherInput['shape'], (matcher: MatcherInput) => unknown>;

function materializeMatcher(matcher: MatcherInput | undefined): unknown {
  return matcher === undefined ? undefined : matcherMap[matcher.shape](matcher);
}

const runHasProperty = (scenario: PropertyScenarioCase, classifier: TestClassifier, error: Error): void => {
  assert.strictEqual(
    classifier.hasPropertyPublic(error, String(scenario.input.propertyName), materializeMatcher(scenario.input.matcher)),
    scenario.expected.value
  );
};

const runMessageContains = (scenario: MessageScenarioCase, classifier: TestClassifier, error: Error): void => {
  assert.strictEqual(classifier.messageContainsPublic(error, ...(scenario.input.patterns ?? [])), scenario.expected.value);
};

const runnerMap: RunnerMap = {
  'classifications': (scenario, classifier) => {
    assert.deepStrictEqual(classifier.retryablePublic('x'), { reason: 'x', retryable: scenario.expected.retryable });
    assert.deepStrictEqual(classifier.nonRetryablePublic('y'), { reason: 'y', retryable: scenario.expected.nonRetryable });
  },
  'has-property-match-array': runHasProperty,
  'has-property-match-predicate': runHasProperty,
  'has-property-match-value': runHasProperty,
  'has-property-mismatch-array': runHasProperty,
  'has-property-mismatch-predicate': runHasProperty,
  'has-property-mismatch-value': runHasProperty,
  'has-property-missing': runHasProperty,
  'has-property-present': runHasProperty,
  'message-contains-hit': runMessageContains,
  'message-contains-miss': runMessageContains
};

function runCase<K extends ScenarioCase['shape']>(scenario: Extract<ScenarioCase, { shape: K }>): void {
  const classifier = new TestClassifier();
  const error = createError(scenario.input);

  runnerMap[scenario.shape](scenario, classifier, error);
}

void describe('ErrorClassifier', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
