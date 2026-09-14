import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { FilterTypeGuards } from '../../src/interfaces.js';
import { ObjectOperators } from '../../src/operators/ObjectOperators.js';
import { Plugin } from '../../src/plugins/Plugin.js';

const optionalMode = (result = false): boolean => result;
const restMode = (...results: boolean[]): boolean => results.some(Boolean);

class FixturePlugin extends Plugin {
  public override operators = {
    'MATCH': (): boolean => true
  };
}

describe('filter runtime guards', () => {
  it('accepts only complete array wildcard sentinels', () => {
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

  it('rejects malformed nested conditions and non-JSON filter values', () => {
    assert.equal(FilterTypeGuards.isFilterCondition({ 'path': 42 }), false);
    assert.equal(FilterTypeGuards.isFilterCondition({
      'conditions': [{ 'field': 42 }],
      'gate': 'CORE.AND'
    }), false);
    assert.equal(FilterTypeGuards.isFilterCondition({
      'path': 'metadata',
      'value': new Map()
    }), false);
    assert.equal(FilterTypeGuards.isFilterCondition({
      'conditions': [{ 'field': 'score', 'value': 10 }],
      'gate': 'CORE.AND'
    }), true);
  });

  it('accepts callable filter modes without inferring a declaration arity', () => {
    assert.equal(FilterTypeGuards.isFilterModeFunction(optionalMode), true);
    assert.equal(FilterTypeGuards.isFilterModeFunction(restMode), true);
    assert.equal(FilterTypeGuards.isFilterModeFunction({}), false);
  });

  it('validates configuration members and nested condition contracts', () => {
    const validConfig: unknown = {
      'conditions': [{ 'path': 'status', 'value': 'active' }],
      'gate': 'CORE.AND',
      'mode': (result = false): boolean => result,
      'plugins': [new FixturePlugin()]
    };
    const malformedConfig: unknown = {
      'conditions': [{
        'conditions': [{ 'field': 42 }],
        'gate': 'CORE.AND'
      }],
      'gate': 'CORE.AND',
      'mode': (result: boolean): boolean => result
    };

    assert.equal(FilterTypeGuards.isValidFilterConfig(validConfig), true);
    assert.equal(FilterTypeGuards.isValidFilterConfig(malformedConfig), false);
    assert.equal(FilterTypeGuards.isValidFilterConfig(new Map()), false);
  });

  it('requires JSON plain objects for object operators while supporting null prototypes', () => {
    const nullPrototypeObject = Object.setPrototypeOf({ 'state': 'active' }, null);

    assert.equal(ObjectOperators.isPlainObjectValue(new Map()), false);
    assert.equal(ObjectOperators.isPlainObjectValue(new Set()), false);
    assert.equal(ObjectOperators.isPlainObjectValue(nullPrototypeObject), true);
    assert.equal(ObjectOperators.handleHasProperty(nullPrototypeObject, 'state'), true);
  });
});
