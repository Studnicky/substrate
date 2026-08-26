import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { FilterValueEntity } from '../../../../src/filters/FilterValueEntity.js';

import { ArrayLogic } from '../../../../src/filters/enums/ArrayLogic.js';
import { FilterMode } from '../../../../src/filters/enums/FilterMode.js';
import { LogicGate } from '../../../../src/filters/enums/LogicGate.js';
import { Operator } from '../../../../src/filters/enums/Operator.js';
import { FilterEngine } from '../../../../src/filters/FilterEngine.js';
import { Plugins } from '../../../../src/filters/registries/index.js';
import scenarioGroups from './filter-engine-characterization.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'array-equals-deep'
  | 'custom-plugin-operator'
  | 'date-between-in-range'
  | 'date-between-out-of-range'
  | 'date-equals-match'
  | 'enum-reachability-sanity'
  | 'map-equals-deep'
  | 'map-has-direct'
  | 'map-size-wildcard'
  | 'nested-or-group'
  | 'registered-custom-gate-operator'
  | 'set-equals-deep'
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
        { 'operator': 'ARRAY.EQUALS', 'path': 'tags', 'value': [...entries] as unknown as FilterValueEntity.Type }
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
          'value': { 'max': new Date(rangeMax), 'min': new Date(rangeMin) } as unknown as FilterValueEntity.Type
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
        { 'operator': 'DATE.EQUALS', 'path': 'birthday', 'value': new Date(dateValue) as unknown as FilterValueEntity.Type }
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
  'map-equals-deep': (scenarioCase) => {
    const { entries } = scenarioCase.input;
    assert.ok(Array.isArray(entries), `${scenarioCase.name} must define input.entries`);
    const { valid, validFail } = scenarioCase.expected;
    assert.ok(typeof valid === 'boolean', `${scenarioCase.name} must define expected.valid`);
    assert.ok(typeof validFail === 'boolean', `${scenarioCase.name} must define expected.validFail`);

    const mapEntries = entries as [string, unknown][];
    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'MAP.EQUALS', 'path': 'roles', 'value': new Map(mapEntries) as unknown as FilterValueEntity.Type }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    assert.equal(engine.evaluate({ 'roles': new Map(mapEntries) }).valid, valid);
    assert.equal(engine.evaluate({ 'roles': new Map([...mapEntries, ['zzz', false]]) }).valid, validFail);
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

    const result = engine.evaluate({ 'roles': new Map(entries as [string, unknown][]) });

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
      'items': items.map((entries) => ({ 'meta': new Map(entries as [string, unknown][]) }))
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
  'set-equals-deep': (scenarioCase) => {
    const { entries } = scenarioCase.input;
    assert.ok(Array.isArray(entries), `${scenarioCase.name} must define input.entries`);
    const { valid, validFail } = scenarioCase.expected;
    assert.ok(typeof valid === 'boolean', `${scenarioCase.name} must define expected.valid`);
    assert.ok(typeof validFail === 'boolean', `${scenarioCase.name} must define expected.validFail`);

    const setEntries = entries as string[];
    const engine = new FilterEngine({
      'conditions': [
        { 'operator': 'SET.EQUALS', 'path': 'tags', 'value': new Set(setEntries) as unknown as FilterValueEntity.Type }
      ],
      'gate': 'CORE.AND',
      'mode': FilterMode.CORE.WHITELIST
    });

    assert.equal(engine.evaluate({ 'tags': new Set(setEntries) }).valid, valid);
    assert.equal(engine.evaluate({ 'tags': new Set([...setEntries, 'zzz']) }).valid, validFail);
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

    const result = engine.evaluate({ 'tags': new Set(entries as string[]) });

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
      'items': items.map((tags) => ({ 'tags': new Set(tags as string[]) }))
    });

    assert.equal(result.valid, requireValid(scenarioCase));
  },
  'string-gate-fail': runStringGate,
  'string-gate-pass': runStringGate
};

void describe('FilterEngine characterization', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runnerMap[scenarioCase.shape](scenarioCase);
    });
  }
});
