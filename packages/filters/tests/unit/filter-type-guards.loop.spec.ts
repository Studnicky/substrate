import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FilterTypeGuards } from '../../src/interfaces.js';
import { ObjectOperators } from '../../src/operators/ObjectOperators.js';
import { Plugin } from '../../src/plugins/Plugin.js';

class FilterModeFixtures {
  public static optionalMode(result = false): boolean {
    const outcome = result === true;
    return outcome;
  }

  public static requiredMode(result: boolean): boolean {
    const outcome = result === true;
    return outcome;
  }

  public static restMode(...results: boolean[]): boolean {
    const outcome = results.includes(true);
    return outcome;
  }
}

class FixturePlugin extends Plugin {
  protected override readonly namespace: string = 'FixturePlugin';

  public override operators = {
    'MATCH': (): boolean => {return true;}
  };
}

void describe('filter runtime guards', () => {
  void it('accepts only complete array wildcard sentinels', () => {
    assert.equal(FilterTypeGuards.isArrayWildcardValue({ 'arrayWildcard': true }), false);
    assert.equal(FilterTypeGuards.isArrayWildcardValue({
      'array': {},
      'arrayWildcard': true,
      'fullPath': 'items[*].state',
      'remainingPath': ['state']
    }), false);
    assert.equal(FilterTypeGuards.isArrayWildcardValue({
      'array': [],
      'arrayWildcard': true,
      'fullPath': 'items[*].state',
      'remainingPath': ['state']
    }), true);
  });

  void it('rejects malformed nested conditions and non-JSON filter values', () => {
    assert.equal(FilterTypeGuards.isFilterCondition({ 'path': 42 }), false);
    assert.equal(FilterTypeGuards.isFilterCondition({
      'conditions': [{ 'field': 42 }],
      'gate': 'CORE.AND'
    }), false);
    assert.equal(FilterTypeGuards.isFilterCondition({
      'path': 'metadata',
      'value': new Map<string, string>()
    }), false);
    assert.equal(FilterTypeGuards.isFilterCondition({
      'conditions': [{ 'field': 'score', 'value': 10 }],
      'gate': 'CORE.AND'
    }), true);
  });

  void it('accepts callable filter modes without inferring a declaration arity', () => {
    assert.equal(FilterTypeGuards.isFilterModeFunction(FilterModeFixtures.optionalMode), true);
    assert.equal(FilterTypeGuards.isFilterModeFunction(FilterModeFixtures.restMode), true);
    assert.equal(FilterTypeGuards.isFilterModeFunction({}), false);
  });

  void it('validates configuration members and nested condition contracts', () => {
    const validConfig: unknown = {
      'conditions': [{ 'path': 'status', 'value': 'active' }],
      'gate': 'CORE.AND',
      'mode': FilterModeFixtures.optionalMode,
      'plugins': [new FixturePlugin()]
    };
    const malformedConfig: unknown = {
      'conditions': [{
        'conditions': [{ 'field': 42 }],
        'gate': 'CORE.AND'
      }],
      'gate': 'CORE.AND',
      'mode': FilterModeFixtures.requiredMode
    };

    assert.equal(FilterTypeGuards.isValidFilterConfig(validConfig), true);
    assert.equal(FilterTypeGuards.isValidFilterConfig(malformedConfig), false);
    assert.equal(FilterTypeGuards.isValidFilterConfig(new Map<string, string>()), false);
  });

  void it('requires JSON plain objects for object operators while supporting null prototypes', () => {
    const nullPrototypeObject: unknown = Object.setPrototypeOf({ 'state': 'active' }, null);

    assert.equal(ObjectOperators.isPlainObjectValue(new Map<string, string>()), false);
    assert.equal(ObjectOperators.isPlainObjectValue(new Set<string>()), false);
    assert.equal(ObjectOperators.isPlainObjectValue(nullPrototypeObject), true);
    assert.equal(ObjectOperators.handleHasProperty(nullPrototypeObject, 'state'), true);
  });
});
