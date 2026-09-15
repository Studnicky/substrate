import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types/node';

import { FilterValueEntity } from '../../../../src/FilterValueEntity.js';

import { ArrayLogic } from '../../../../src/enums/ArrayLogic.js';
import { FilterMode } from '../../../../src/enums/FilterMode.js';
import { LogicGate } from '../../../../src/enums/LogicGate.js';
import { Operator } from '../../../../src/enums/Operator.js';
import { FilterEngine } from '../../../../src/FilterEngine.js';
import { ObjectOperators } from '../../../../src/operators/ObjectOperators.js';
import { Plugins } from '../../../../src/registries/index.js';
import scenarioGroups from './filter-engine-characterization.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'array-equals-deep'
  | 'custom-plugin-operator'
  | 'date-between-in-range'
  | 'date-between-out-of-range'
  | 'date-equals-match'
  | 'enum-reachability-sanity'
  | 'map-has-direct'
  | 'map-size-wildcard'
  | 'nested-or-group'
  | 'registered-custom-gate-operator'
  | 'set-has-direct'
  | 'set-size-wildcard'
  | 'string-gate-fail'
  | 'string-gate-pass';

type ScenarioInput = {
  data?: Record<string, unknown>;
  dateValue?: string;
  entries?: unknown[];
  failData?: Record<string, unknown>;
  failValue?: string;
  items?: unknown[][];
  matchData?: Record<string, unknown>;
  matchValue?: string;
  rangeMax?: string;
  rangeMin?: string;
  size?: number;
};

type ScenarioExpected = {
  valid?: boolean;
  validFail?: boolean;
};

type ScenarioCase = {
  description: string;
  expected: ScenarioExpected;
  input: ScenarioInput;
  name: string;
  shape: ScenarioShape;
};

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

const scenarioShapes: readonly ScenarioShape[] = [
  'array-equals-deep',
  'custom-plugin-operator',
  'date-between-in-range',
  'date-between-out-of-range',
  'date-equals-match',
  'enum-reachability-sanity',
  'map-has-direct',
  'map-size-wildcard',
  'nested-or-group',
  'registered-custom-gate-operator',
  'set-has-direct',
  'set-size-wildcard',
  'string-gate-fail',
  'string-gate-pass'
];

const isScenarioShape = (value: unknown): value is ScenarioShape => {
  const result = scenarioShapes.some((shape) => shape === value);

  return result;
};

const isScenarioCase = (value: unknown): value is ScenarioCase => {
  if (!Predicates.isRecord(value) || !Predicates.isRecord(value.expected) || !Predicates.isRecord(value.input)) {
    return false;
  }

  const result = typeof value.description === 'string'
    && typeof value.name === 'string'
    && typeof value.shape === 'string'
    && isScenarioShape(value.shape);

  return result;
};

const requireData = (scenarioCase: ScenarioCase): Record<string, unknown> => {
  const { data } = scenarioCase.input;
  assert.ok(data !== undefined, `${scenarioCase.name} must define input.data`);
  return data;
};

const requireValid = (scenarioCase: ScenarioCase): boolean => {
  const { valid } = scenarioCase.expected;
  assert.ok(typeof valid === 'boolean', `${scenarioCase.name} must define expected.valid`);
  return valid;
};

const mapFromEntries = (entries: unknown[]): Map<unknown, unknown> => {
  const result = new Map<unknown, unknown>();
  const length = entries.length;

  for (let index = 0; index < length; index += 1) {
    const entry = entries[index];
    assert.ok(Array.isArray(entry) && entry.length === 2, `Each map entry must contain exactly one key and value`);
    result.set(entry[0], entry[1]);
  }

  return result;
};

const runStringGate = (scenarioCase: ScenarioCase): void => {
  const engine = new FilterEngine({
    'conditions': [
      { 'operator': 'STRING.EQUALS', 'path': 'name', 'value': 'Alice' }
    ],
    'gate': 'CORE.AND',
    'mode': FilterMode.CORE.WHITELIST
  });

  const result = engine.evaluate(requireData(scenarioCase));

  assert.equal(result.valid, requireValid(scenarioCase));
};

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'array-equals-deep': (scenarioCase) => {
    const { entries } = scenarioCase.input;
    assert.ok(Array.isArray(entries), `${scenarioCase.name} must define input.entries`);
    const { valid, validFail } = scenarioCase.expected;
    assert.ok(typeof valid === 'boolean', `${scenarioCase.name} must define expected.valid`);
    assert.ok(typeof validFail === 'boolean', `${scenarioCase.name} must define expected.validFail`);

    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'ARRAY.EQUALS', 'path': 'tags', 'value': FilterValueEntity.intake(entries) }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    assert.equal(engine.evaluate({ 'tags': [...entries] }).valid, valid);
    assert.equal(engine.evaluate({ 'tags': [...entries, 'zzz'] }).valid, validFail);
  },
  'custom-plugin-operator': (scenarioCase) => {
    const { failValue, matchValue } = scenarioCase.input;
    assert.ok(typeof matchValue === 'string', `${scenarioCase.name} must define input.matchValue`);
    assert.ok(typeof failValue === 'string', `${scenarioCase.name} must define input.failValue`);
    const { valid, validFail } = scenarioCase.expected;
    assert.ok(typeof valid === 'boolean', `${scenarioCase.name} must define expected.valid`);
    assert.ok(typeof validFail === 'boolean', `${scenarioCase.name} must define expected.validFail`);

    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'custom:myOperator', 'path': 'value', 'value': matchValue }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST,
      'plugins': [
        {
          'getNamespace': () => 'custom',
          'operators': {
            'myOperator': (value, filterValue) => value === filterValue
          }
        }
      ]
    });

    assert.equal(engine.evaluate({ 'value': matchValue }).valid, valid);
    assert.equal(engine.evaluate({ 'value': failValue }).valid, validFail);
  },
  'date-between-in-range': (scenarioCase) => {
    const { dateValue, rangeMax, rangeMin } = scenarioCase.input;
    assert.ok(typeof dateValue === 'string', `${scenarioCase.name} must define input.dateValue`);
    assert.ok(typeof rangeMax === 'string', `${scenarioCase.name} must define input.rangeMax`);
    assert.ok(typeof rangeMin === 'string', `${scenarioCase.name} must define input.rangeMin`);

    const engine = new FilterEngine({
      'conditions': [
        {
          'operator': 'DATE.BETWEEN',
          'path': 'birthday',
          'value': { 'max': rangeMax, 'min': rangeMin }
        }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate({ 'birthday': new Date(dateValue) });

    assert.equal(result.valid, requireValid(scenarioCase));
  },
  'date-between-out-of-range': (scenarioCase) => {
    runnerMap['date-between-in-range'](scenarioCase);
  },
  'date-equals-match': (scenarioCase) => {
    const { dateValue } = scenarioCase.input;
    assert.ok(typeof dateValue === 'string', `${scenarioCase.name} must define input.dateValue`);

    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'DATE.EQUALS', 'path': 'birthday', 'value': dateValue }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate({ 'birthday': new Date(dateValue) });

    assert.equal(result.valid, requireValid(scenarioCase));
  },
  'enum-reachability-sanity': () => {
    assert.equal(typeof LogicGate.CORE.AND, 'function');
    assert.equal(typeof Operator.STRING.EQUALS, 'function');
    assert.equal(typeof ArrayLogic.CORE.EVERY, 'function');
  },
  'map-has-direct': (scenarioCase) => {
    const { entries, matchValue } = scenarioCase.input;
    assert.ok(Array.isArray(entries), `${scenarioCase.name} must define input.entries`);
    assert.ok(typeof matchValue === 'string', `${scenarioCase.name} must define input.matchValue`);

    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'MAP.HAS', 'path': 'roles', 'value': matchValue }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate({ 'roles': mapFromEntries(entries) });

    assert.equal(result.valid, requireValid(scenarioCase));
  },
  'map-size-wildcard': (scenarioCase) => {
    const { items, size } = scenarioCase.input;
    assert.ok(Array.isArray(items), `${scenarioCase.name} must define input.items`);
    assert.ok(typeof size === 'number', `${scenarioCase.name} must define input.size`);

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

    const result = engine.evaluate({
      'items': items.map((entries) => ({ 'meta': mapFromEntries(entries) }))
    });

    assert.equal(result.valid, requireValid(scenarioCase));
  },
  'nested-or-group': (scenarioCase) => {
    const { failData, matchData } = scenarioCase.input;
    assert.ok(matchData !== undefined, `${scenarioCase.name} must define input.matchData`);
    assert.ok(failData !== undefined, `${scenarioCase.name} must define input.failData`);
    const { valid, validFail } = scenarioCase.expected;
    assert.ok(typeof valid === 'boolean', `${scenarioCase.name} must define expected.valid`);
    assert.ok(typeof validFail === 'boolean', `${scenarioCase.name} must define expected.validFail`);

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

    assert.equal(engine.evaluate(matchData).valid, valid);
    assert.equal(engine.evaluate(failData).valid, validFail);
  },
  'registered-custom-gate-operator': (scenarioCase) => {
    const plugins = new Plugins();

    plugins.gates.set('customAlwaysTrue', () => true);
    plugins.operators.set('customAlwaysMatch', () => true);

    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'customAlwaysMatch', 'path': 'name', 'value': 'irrelevant' }
      ],
      'gate': 'customAlwaysTrue',
      'mode': FilterMode.CORE.WHITELIST,
      'registry': plugins
    });

    const result = engine.evaluate(requireData(scenarioCase));

    assert.equal(result.valid, requireValid(scenarioCase));
  },
  'set-has-direct': (scenarioCase) => {
    const { entries, matchValue } = scenarioCase.input;
    assert.ok(Array.isArray(entries), `${scenarioCase.name} must define input.entries`);
    assert.ok(typeof matchValue === 'string', `${scenarioCase.name} must define input.matchValue`);

    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'SET.HAS', 'path': 'tags', 'value': matchValue }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate({ 'tags': new Set(entries) });

    assert.equal(result.valid, requireValid(scenarioCase));
  },
  'set-size-wildcard': (scenarioCase) => {
    const { items, size } = scenarioCase.input;
    assert.ok(Array.isArray(items), `${scenarioCase.name} must define input.items`);
    assert.ok(typeof size === 'number', `${scenarioCase.name} must define input.size`);

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

    const result = engine.evaluate({
      'items': items.map((tags) => ({ 'tags': new Set(tags) }))
    });

    assert.equal(result.valid, requireValid(scenarioCase));
  },
  'string-gate-fail': runStringGate,
  'string-gate-pass': runStringGate
};

void describe('FilterEngine characterization', () => {
  it('retains non-string native Map keys during evaluation', () => {
    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'MAP.HAS', 'path': 'roles', 'value': 42 }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    const result = engine.evaluate({ 'roles': new Map([[42, true]]) });

    assert.equal(result.valid, true);
  });

  for (const scenarioCase of scenarioGroups.cases) {
    assert.ok(isScenarioCase(scenarioCase), 'Each scenario must define name, description, input, expected, and a known shape.');
    void it(scenarioCase.name, () => {
      runnerMap[scenarioCase.shape](scenarioCase);
    });
  }
});

void describe('canonical deep equality', () => {
  it('uses the predicate contract for arrays and object values', () => {
    assert.equal(Operator.ARRAY.EQUALS([Number.NaN], [Number.NaN]), true);
    assert.equal(Operator.ARRAY.EQUALS([ 'Ada' ], [ 'ada' ]), false);
    assert.equal(ObjectOperators.handleEquals({ 'score': Number.NaN }, { 'score': Number.NaN }), true);
  });
});

void describe('filter frozen exports', () => {
  it('preserves the nested immutability contract through JSON Frozen', () => {
    assert.equal(Object.isFrozen(FilterMode), true);
    assert.equal(Object.isFrozen(FilterMode.CORE), true);
    assert.equal(Reflect.set(FilterMode.CORE, 'WHITELIST', () => false), false);
  });
});
