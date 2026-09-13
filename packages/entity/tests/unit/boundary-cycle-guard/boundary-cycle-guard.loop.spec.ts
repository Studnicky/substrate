import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BoundaryCycleGuard } from '../../../src/BoundaryCycleGuard.js';
import scenarioGroups from './boundary-cycle-guard.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'acyclic-value-false'
  | 'cycle-nested-map'
  | 'cycle-nested-set'
  | 'date-opaque-leaf'
  | 'diamond-non-cycle'
  | 'map-set-no-cycle'
  | 'primitives-false'
  | 'self-reference-array'
  | 'self-reference-object';

type ScenarioInput = {
  leaf?: Record<string, unknown>;
  mapEntries?: [string, number][];
  setValues?: number[];
  timestamp?: number;
  value?: unknown;
  values?: unknown[];
};

type ScenarioCase = {
  description: string;
  expected: { value: boolean };
  input: ScenarioInput;
  name: string;
  shape: ScenarioShape;
};

type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

const runnerMap: Record<ScenarioShape, ScenarioRunner> = {
  'acyclic-value-false': (scenarioCase) => {
    assert.equal(BoundaryCycleGuard.hasCycle(scenarioCase.input.value), scenarioCase.expected.value);
  },
  'cycle-nested-map': (scenarioCase) => {
    const value: Record<string, unknown> = {};
    const map = new Map<string, unknown>([['self', value]]);
    value.map = map;
    assert.equal(BoundaryCycleGuard.hasCycle(value), scenarioCase.expected.value);
  },
  'cycle-nested-set': (scenarioCase) => {
    const value: Record<string, unknown> = {};
    const set = new Set<unknown>([value]);
    value.set = set;
    assert.equal(BoundaryCycleGuard.hasCycle(value), scenarioCase.expected.value);
  },
  'date-opaque-leaf': (scenarioCase) => {
    const value = { 'when': new Date(scenarioCase.input.timestamp ?? 0) };
    assert.equal(BoundaryCycleGuard.hasCycle(value), scenarioCase.expected.value);
  },
  'diamond-non-cycle': (scenarioCase) => {
    const shared = scenarioCase.input.leaf ?? { 'value': 1 };
    const value = { 'left': shared, 'right': shared };
    assert.equal(BoundaryCycleGuard.hasCycle(value), scenarioCase.expected.value);
  },
  'map-set-no-cycle': (scenarioCase) => {
    const mapEntries = scenarioCase.input.mapEntries ?? [];
    const setValues = scenarioCase.input.setValues ?? [];
    const value = { 'map': new Map<string, number>(mapEntries), 'set': new Set<number>(setValues) };
    assert.equal(BoundaryCycleGuard.hasCycle(value), scenarioCase.expected.value);
  },
  'primitives-false': (scenarioCase) => {
    for (const value of [...(scenarioCase.input.values ?? []), undefined]) {
      assert.equal(BoundaryCycleGuard.hasCycle(value), scenarioCase.expected.value);
    }
  },
  'self-reference-array': (scenarioCase) => {
    const value: unknown[] = [];
    value.push(value);
    assert.equal(BoundaryCycleGuard.hasCycle(value), scenarioCase.expected.value);
  },
  'self-reference-object': (scenarioCase) => {
    const value: Record<string, unknown> = {};
    value.self = value;
    assert.equal(BoundaryCycleGuard.hasCycle(value), scenarioCase.expected.value);
  }
};

void describe('BoundaryCycleGuard.hasCycle', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, () => {
      runnerMap[scenarioCase.shape](scenarioCase);
    });
  }
});
