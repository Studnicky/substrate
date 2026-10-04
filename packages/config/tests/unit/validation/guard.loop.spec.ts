import { JsonObject, Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';

import type { ScenarioCaseOfType } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import type { ScenarioJsonValueEntity } from '../entities/ScenarioJsonValueEntity.js';

import { ScenarioSuite } from '../../../../../scripts/test-helpers/scenario-kit/dist/index.js';
import { GuardScenarioCaseEntity } from '../entities/GuardScenarioCaseEntity.js';
import scenarioGroups from './guard.scenarios.json' with { 'type': 'json' };

class GuardRunners {
  private static readonly specialShapes = new Set<string>(['function', 'map', 'namedFunction', 'nan', 'null', 'set', 'undefined']);

  static 'asNumber'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'asNumber', 'predicate'>): void {
    assert.strictEqual(Predicates.asNumber(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  static 'asRecordArray'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'asRecordArray', 'predicate'>): void {
    assert.deepStrictEqual(Predicates.asRecordArray(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  static 'asStringOrNull'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'asStringOrNull', 'predicate'>): void {
    assert.strictEqual(Predicates.asStringOrNull(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  static 'isBoolean'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'isBoolean', 'predicate'>): void {
    assert.strictEqual(Predicates.isBoolean(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  static 'isFunction'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'isFunction', 'predicate'>): void {
    assert.strictEqual(Predicates.isFunction(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  static 'isNonNegativeInteger'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'isNonNegativeInteger', 'predicate'>): void {
    assert.strictEqual(Predicates.isNonNegativeInteger(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  static 'isNumber'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'isNumber', 'predicate'>): void {
    assert.strictEqual(Predicates.isNumber(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  static 'isObject'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'isObject', 'predicate'>): void {
    assert.strictEqual(Predicates.isObject(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  static 'isPositiveInteger'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'isPositiveInteger', 'predicate'>): void {
    assert.strictEqual(Predicates.isPositiveInteger(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  static 'isString'(scenarioCase: ScenarioCaseOfType<GuardScenarioCaseEntity.Type, 'isString', 'predicate'>): void {
    assert.strictEqual(Predicates.isString(GuardRunners.materialize(scenarioCase.input)), GuardRunners.materialize(scenarioCase.outcome));
  }

  /** Turns a serialized fixture value into the runtime value it stands for; `{ shape }` records name values JSON cannot carry. */
  private static materialize(value: ScenarioJsonValueEntity.Type): unknown {
    if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value)) {
      const items = GuardRunners.materializeArray(value);
      return items;
    }
    const record = GuardRunners.materializeRecord(value);
    return record;
  }

  private static materializeArray(value: readonly ScenarioJsonValueEntity.Type[]): unknown[] {
    const items: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      items.push(GuardRunners.materialize(value[index] ?? null));
    }
    return items;
  }

  private static materializeRecord(value: Readonly<Record<string, ScenarioJsonValueEntity.Type>>): unknown {
    const shape: unknown = Reflect.get(value, 'shape');
    if (typeof shape === 'string' && GuardRunners.specialShapes.has(shape)) {
      const special = GuardRunners.materializeSpecial(shape);
      return special;
    }
    const entries = new Map<string, unknown>();
    const pairs = Object.entries(value);
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      if (pair !== undefined) {
        entries.set(pair[0], GuardRunners.materialize(pair[1]));
      }
    }
    const record = JsonObject.fromEntries(entries);
    return record;
  }

  private static materializeSpecial(shape: string): unknown {
    if (shape === 'function') {
      return GuardRunners.fixtureFunction;
    }
    if (shape === 'namedFunction') {
      return GuardRunners.namedFixtureFunction;
    }
    if (shape === 'map') {
      return new Map<unknown, unknown>();
    }
    if (shape === 'set') {
      return new Set<unknown>();
    }
    if (shape === 'nan') {
      return Number.NaN;
    }
    if (shape === 'null') {
      return null;
    }
    return undefined;
  }

  private static fixtureFunction(): void {}

  private static namedFixtureFunction(): void {}
}

ScenarioSuite.registerBy('predicate', {
  'entity': GuardScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'Predicates guards',
  'runners': GuardRunners
});
