import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '../../src/predicates/Predicates.js';

import scenarioGroups from './predicates-network-and-versioning.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'cidr-in-range'
  | 'range-date-boundary'
  | 'range-numeric-boundary'
  | 'range-string-case'
  | 'semver-compare-sign'
  | 'semver-satisfies'
  | 'strict-number';

type BaseScenarioCase<Shape extends ScenarioShape> = {
  description: string;
  expected: Record<string, unknown>;
  input: Record<string, unknown>;
  name: string;
  shape: Shape;
};

type ScenarioCaseByShape = {
  [Shape in ScenarioShape]: BaseScenarioCase<Shape>;
};

type ScenarioCase = ScenarioCaseByShape[ScenarioShape];
type ScenarioRunnerMap = Record<ScenarioShape, (scenarioCase: ScenarioCase) => void>;

const runnerMap: ScenarioRunnerMap = {
  'cidr-in-range': (scenarioCase) => {
    const { ip, cidr } = scenarioCase.input;
    const result = Predicates.isIpInCidr(String(ip), String(cidr));
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'range-date-boundary': (scenarioCase) => {
    const { value, minimum, maximum, boundary } = scenarioCase.input;
    const options: { 'boundary'?: 'closed' | 'half-open' } = {};

    if (boundary === 'closed' || boundary === 'half-open') {
      options.boundary = boundary;
    }

    const result = Predicates.performRangeComparison(
      new Date(String(value)),
      new Date(String(minimum)),
      new Date(String(maximum)),
      true,
      options
    );
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'range-numeric-boundary': (scenarioCase) => {
    const { value, minimum, maximum, boundary } = scenarioCase.input;
    const options: { 'boundary'?: 'closed' | 'half-open' } = {};

    if (boundary === 'closed' || boundary === 'half-open') {
      options.boundary = boundary;
    }

    const result = Predicates.performRangeComparison(value, minimum, maximum, true, options);
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'range-string-case': (scenarioCase) => {
    const { value, minimum, maximum, caseSensitive } = scenarioCase.input;
    const options: { 'caseSensitive'?: boolean } = {};

    if (typeof caseSensitive === 'boolean') {
      options.caseSensitive = caseSensitive;
    }

    const result = Predicates.performRangeComparison(value, minimum, maximum, true, options);
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'semver-compare-sign': (scenarioCase) => {
    const { first, second } = scenarioCase.input;
    const result = Predicates.compareSemverVersions(String(first), String(second));
    const sign = Math.sign(result);
    assert.strictEqual(sign, scenarioCase.expected.sign);
  },
  'semver-satisfies': (scenarioCase) => {
    const { version, range } = scenarioCase.input;
    const result = Predicates.satisfiesSemverRange(String(version), String(range));
    assert.strictEqual(result, scenarioCase.expected.result);
  },
  'strict-number': (scenarioCase) => {
    const value = scenarioCase.input.nan === true ? Number.NaN : scenarioCase.input.value;
    const result = Predicates.asStrictNumber(value);
    assert.strictEqual(result ?? null, scenarioCase.expected.result);
  }
};

function runCase<Shape extends ScenarioShape>(scenarioCase: ScenarioCaseByShape[Shape]): void {
  runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Predicates network and versioning', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
