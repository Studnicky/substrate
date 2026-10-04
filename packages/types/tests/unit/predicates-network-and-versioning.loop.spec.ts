import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { PredicatesNetworkAndVersioningScenarioCaseEntity } from '../../../../scripts/test-helpers/scenario-kit/dist/types-fixtures/PredicatesNetworkAndVersioningScenarioCaseEntity.js';
import { Predicates } from '../../src/predicates/Predicates.js';
import scenarioGroups from './predicates-network-and-versioning.scenarios.json' with { 'type': 'json' };

class PredicatesRunners {
  static 'cidr-in-range'(
    scenarioCase: ScenarioCaseOfType<
      PredicatesNetworkAndVersioningScenarioCaseEntity.Type,
      'cidr-in-range'
    >
  ): void {
    const { cidr, ip } = scenarioCase.input;
    const result = Predicates.isIpInCidr(String(ip), String(cidr));
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static 'range-date-boundary'(
    scenarioCase: ScenarioCaseOfType<
      PredicatesNetworkAndVersioningScenarioCaseEntity.Type,
      'range-date-boundary'
    >
  ): void {
    const { boundary, maximum, minimum, value } = scenarioCase.input;
    const options: { 'boundary'?: 'closed' | 'half-open' } = {};

    if (boundary === 'closed') {
      options.boundary = 'closed';
    }
    if (boundary === 'half-open') {
      options.boundary = 'half-open';
    }

    const result = Predicates.performRangeComparison(
      new Date(String(value)),
      new Date(String(minimum)),
      new Date(String(maximum)),
      true,
      options
    );
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static 'range-numeric-boundary'(
    scenarioCase: ScenarioCaseOfType<
      PredicatesNetworkAndVersioningScenarioCaseEntity.Type,
      'range-numeric-boundary'
    >
  ): void {
    const { boundary, maximum, minimum, value } = scenarioCase.input;
    const options: { 'boundary'?: 'closed' | 'half-open' } = {};

    if (boundary === 'closed') {
      options.boundary = 'closed';
    }
    if (boundary === 'half-open') {
      options.boundary = 'half-open';
    }

    const result = Predicates.performRangeComparison(value, minimum, maximum, true, options);
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static 'range-string-case'(
    scenarioCase: ScenarioCaseOfType<
      PredicatesNetworkAndVersioningScenarioCaseEntity.Type,
      'range-string-case'
    >
  ): void {
    const { caseSensitive, maximum, minimum, value } = scenarioCase.input;
    const options: { 'caseSensitive'?: boolean } = {};

    if (typeof caseSensitive === 'boolean') {
      options.caseSensitive = caseSensitive;
    }

    const result = Predicates.performRangeComparison(value, minimum, maximum, true, options);
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static 'semver-compare-sign'(
    scenarioCase: ScenarioCaseOfType<
      PredicatesNetworkAndVersioningScenarioCaseEntity.Type,
      'semver-compare-sign'
    >
  ): void {
    const { first, second } = scenarioCase.input;
    const result = Predicates.compareSemverVersions(String(first), String(second));
    const sign = Math.sign(result);
    assert.strictEqual(sign, scenarioCase.expected.sign);
  }

  static 'semver-satisfies'(
    scenarioCase: ScenarioCaseOfType<
      PredicatesNetworkAndVersioningScenarioCaseEntity.Type,
      'semver-satisfies'
    >
  ): void {
    const { range, version } = scenarioCase.input;
    const result = Predicates.satisfiesSemverRange(String(version), String(range));
    assert.strictEqual(result, scenarioCase.expected.result);
  }

  static 'strict-number'(
    scenarioCase: ScenarioCaseOfType<
      PredicatesNetworkAndVersioningScenarioCaseEntity.Type,
      'strict-number'
    >
  ): void {
    const value = scenarioCase.input.nan === true ? Number.NaN : scenarioCase.input.value;
    const result = Predicates.asStrictNumber(value);
    assert.strictEqual(result ?? null, scenarioCase.expected.result);
  }
}

ScenarioSuite.register({
  'entity': PredicatesNetworkAndVersioningScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Predicates network and versioning',
  'runners': PredicatesRunners
});
