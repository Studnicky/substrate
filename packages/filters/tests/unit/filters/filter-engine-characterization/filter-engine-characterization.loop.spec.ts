import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ScenarioCaseOfType } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';

import { ScenarioSuite } from '../../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { ArrayLogic } from '../../../../src/enums/ArrayLogic.js';
import { FilterMode } from '../../../../src/enums/FilterMode.js';
import { LogicGate } from '../../../../src/enums/LogicGate.js';
import { Operator } from '../../../../src/enums/Operator.js';
import { FilterEngine } from '../../../../src/FilterEngine.js';
import { FilterValueEntity } from '../../../../src/FilterValueEntity.js';
import { ObjectOperators } from '../../../../src/operators/ObjectOperators.js';
import { ValueOperators } from '../../../../src/operators/ValueOperators.js';
import { Plugins } from '../../../../src/registries/index.js';
import { FilterEngineCharacterizationScenarioCaseEntity } from './entities/FilterEngineCharacterizationScenarioCaseEntity.js';
import scenarioGroups from './filter-engine-characterization.scenarios.json' with { 'type': 'json' };

class FilterEngineCharacterizationRunners {
  static 'array-equals-deep'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'array-equals-deep'
    >
  ): void {
    const { expected, input } = scenarioCase;
    const { entries } = input;

    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'ARRAY.EQUALS', 'path': 'tags', 'value': FilterValueEntity.intake(entries) }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    assert.equal(engine.evaluate({ 'tags': [...entries] }).valid, expected.valid);
    assert.equal(engine.evaluate({ 'tags': [...entries, 'zzz'] }).valid, expected.validFail);
  }

  static 'custom-plugin-operator'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'custom-plugin-operator'
    >
  ): void {
    const { expected, input } = scenarioCase;
    const { failValue, matchValue } = input;

    const engine = new FilterEngine({
      'conditions': [{ 'operator': 'custom:myOperator', 'path': 'value', 'value': matchValue }],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST,
      'plugins': [
        {
          'getNamespace': () => {
            return 'custom';
          },
          'operators': {
            'myOperator': (value, filterValue) => {
              const matches = value === filterValue;
              return matches;
            }
          }
        }
      ]
    });

    assert.equal(engine.evaluate({ 'value': matchValue }).valid, expected.valid);
    assert.equal(engine.evaluate({ 'value': failValue }).valid, expected.validFail);
  }

  static 'date-between-in-range'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'date-between-in-range'
    >
  ): void {
    FilterEngineCharacterizationRunners.assertDateBetween(scenarioCase);
  }

  static 'date-between-out-of-range'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'date-between-out-of-range'
    >
  ): void {
    FilterEngineCharacterizationRunners.assertDateBetween(scenarioCase);
  }

  static 'date-equals-match'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'date-equals-match'
    >
  ): void {
    const { dateValue } = scenarioCase.input;

    const engine = new FilterEngine({
      'conditions': [{ 'operator': 'DATE.EQUALS', 'path': 'birthday', 'value': dateValue }],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate({ 'birthday': new Date(dateValue) });

    assert.equal(result.valid, scenarioCase.expected.valid);
  }

  static 'enum-reachability-sanity'(
    _scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'enum-reachability-sanity'
    >
  ): void {
    assert.equal(typeof LogicGate.CORE.AND, 'function');
    assert.equal(typeof Operator.STRING.EQUALS, 'function');
    assert.equal(typeof ArrayLogic.CORE.EVERY, 'function');
  }

  static 'map-has-direct'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'map-has-direct'
    >
  ): void {
    const { entries, matchValue } = scenarioCase.input;

    const engine = new FilterEngine({
      'conditions': [{ 'operator': 'MAP.HAS', 'path': 'roles', 'value': matchValue }],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate({
      'roles': FilterEngineCharacterizationRunners.mapFromEntries(entries)
    });

    assert.equal(result.valid, scenarioCase.expected.valid);
  }

  static 'map-size-wildcard'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'map-size-wildcard'
    >
  ): void {
    const { items, size } = scenarioCase.input;

    const engine = new FilterEngine({
      'conditions': [
        {
          'groupGates': ['EVERY'],
          'operator': 'MAP.SIZE',
          'path': 'items[*].meta',
          'value': size
        }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const wrapped: { 'meta': Map<unknown, unknown> }[] = [];
    for (let index = 0; index < items.length; index += 1) {
      wrapped.push({
        'meta': FilterEngineCharacterizationRunners.mapFromEntries(items[index] ?? [])
      });
    }
    const result = engine.evaluate({ 'items': wrapped });

    assert.equal(result.valid, scenarioCase.expected.valid);
  }

  static 'nested-or-group'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'nested-or-group'
    >
  ): void {
    const { expected, input } = scenarioCase;
    const { failData, matchData } = input;

    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'STRING.EQUALS', 'path': 'status', 'value': 'active' },
        {
          'conditions': [
            { 'operator': 'NUMBER.EQUALS', 'path': 'priority', 'value': 1 },
            { 'operator': 'NUMBER.EQUALS', 'path': 'priority', 'value': 2 }
          ],
          'gate': 'CORE.OR'
        }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    assert.equal(engine.evaluate(matchData).valid, expected.valid);
    assert.equal(engine.evaluate(failData).valid, expected.validFail);
  }

  static 'registered-custom-gate-operator'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'registered-custom-gate-operator'
    >
  ): void {
    const plugins = new Plugins();

    plugins.gates.set('customAlwaysTrue', () => {
      const always = true;
      return always;
    });
    plugins.operators.set('customAlwaysMatch', () => {
      const always = true;
      return always;
    });

    const engine = new FilterEngine({
      'conditions': [{ 'operator': 'customAlwaysMatch', 'path': 'name', 'value': 'irrelevant' }],
      'gate': 'customAlwaysTrue',
      'mode': FilterMode.CORE.WHITELIST,
      'registry': plugins
    });

    const result = engine.evaluate(scenarioCase.input.data);

    assert.equal(result.valid, scenarioCase.expected.valid);
  }

  static 'set-has-direct'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'set-has-direct'
    >
  ): void {
    const { entries, matchValue } = scenarioCase.input;

    const engine = new FilterEngine({
      'conditions': [{ 'operator': 'SET.HAS', 'path': 'tags', 'value': matchValue }],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate({ 'tags': new Set(entries) });

    assert.equal(result.valid, scenarioCase.expected.valid);
  }

  static 'set-size-wildcard'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'set-size-wildcard'
    >
  ): void {
    const { items, size } = scenarioCase.input;

    const engine = new FilterEngine({
      'conditions': [
        {
          'groupGates': ['EVERY'],
          'operator': 'SET.SIZE',
          'path': 'items[*].tags',
          'value': size
        }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const wrapped: { 'tags': Set<unknown> }[] = [];
    for (let index = 0; index < items.length; index += 1) {
      wrapped.push({ 'tags': new Set(items[index]) });
    }
    const result = engine.evaluate({ 'items': wrapped });

    assert.equal(result.valid, scenarioCase.expected.valid);
  }

  static 'string-gate-fail'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'string-gate-fail'
    >
  ): void {
    FilterEngineCharacterizationRunners.assertStringGate(scenarioCase);
  }

  static 'string-gate-pass'(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'string-gate-pass'
    >
  ): void {
    FilterEngineCharacterizationRunners.assertStringGate(scenarioCase);
  }

  static declaresNonStringMapKeys(): void {
    void it('retains non-string native Map keys during evaluation', () => {
      const engine = new FilterEngine({
        'conditions': [{ 'operator': 'MAP.HAS', 'path': 'roles', 'value': 42 }],
        'gate': 'CORE.AND',
        'mode': FilterMode.CORE.WHITELIST
      });

      const result = engine.evaluate({ 'roles': new Map([[42, true]]) });

      assert.equal(result.valid, true);
    });
  }

  private static assertDateBetween(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'date-between-in-range' | 'date-between-out-of-range'
    >
  ): void {
    const { dateValue, rangeMaximum, rangeMinimum } = scenarioCase.input;

    const engine = new FilterEngine({
      'conditions': [
        {
          'operator': 'DATE.BETWEEN',
          'path': 'birthday',
          'value': { 'max': rangeMaximum, 'min': rangeMinimum }
        }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate({ 'birthday': new Date(dateValue) });

    assert.equal(result.valid, scenarioCase.expected.valid);
  }

  private static assertStringGate(
    scenarioCase: ScenarioCaseOfType<
      FilterEngineCharacterizationScenarioCaseEntity.Type,
      'string-gate-fail' | 'string-gate-pass'
    >
  ): void {
    const engine = new FilterEngine({
      'conditions': [{ 'operator': 'STRING.EQUALS', 'path': 'name', 'value': 'Alice' }],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate(scenarioCase.input.data);

    assert.equal(result.valid, scenarioCase.expected.valid);
  }

  private static mapFromEntries(entries: readonly unknown[]): Map<unknown, unknown> {
    const result = new Map<unknown, unknown>();
    const length = entries.length;

    for (let index = 0; index < length; index += 1) {
      const entry = entries[index];
      assert.ok(
        Array.isArray(entry) && entry.length === 2,
        'Each map entry must contain exactly one key and value'
      );
      result.set(entry[0], entry[1]);
    }

    return result;
  }
}

ScenarioSuite.register({
  'entity': FilterEngineCharacterizationScenarioCaseEntity,
  'extraTests': FilterEngineCharacterizationRunners.declaresNonStringMapKeys,
  'file': scenarioGroups,
  'name': 'FilterEngine characterization',
  'runners': FilterEngineCharacterizationRunners
});

void describe('canonical deep equality', () => {
  void it('uses the predicate contract for arrays and object values', () => {
    assert.equal(Operator.ARRAY.EQUALS([Number.NaN], [Number.NaN]), true);
    assert.equal(Operator.ARRAY.EQUALS(['Ada'], ['ada']), false);
    assert.equal(ObjectOperators.handleEquals({ 'score': Number.NaN }, { 'score': Number.NaN }), true);
  });
});

void describe('value membership SameValueZero semantics', () => {
  void it('matches NaN in handleIn', () => {
    assert.equal(ValueOperators.handleIn(Number.NaN, [Number.NaN]), true);
  });

  void it('rejects NaN from handleNotIn', () => {
    assert.equal(ValueOperators.handleNotIn(Number.NaN, [Number.NaN]), false);
  });
});

void describe('filter frozen exports', () => {
  void it('preserves the nested immutability contract through JSON Frozen', () => {
    assert.equal(Object.isFrozen(FilterMode), true);
    assert.equal(Object.isFrozen(FilterMode.CORE), true);
    assert.equal(
      Reflect.set(FilterMode.CORE, 'WHITELIST', () => {
        const rejected = false;
        return rejected;
      }),
      false
    );
  });
});
