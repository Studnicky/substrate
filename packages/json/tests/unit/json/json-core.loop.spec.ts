import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DraftNodeStateEntity,
  PatchApplyResultStatusEntity,
  PathWildcardResultEntity
} from '../../../src/entities/index.js';
import {
  Clone,
  Frozen,
  FrozenMutationError,
  Merge,
  Sort
} from '../../../src/index.js';
import { JsonCoreScenarioCaseEntity } from './entities/JsonCoreScenarioCaseEntity.js';
import { OTHER_PATTERN } from './fixtures/OTHER_PATTERN.js';
import { VALUE_PATTERN } from './fixtures/VALUE_PATTERN.js';
import scenarioGroups from './json-core.scenarios.json' with { 'type': 'json' };

class TaggedClone extends Clone {
  protected static override cloneObject(value: Record<string, unknown>): Record<string, unknown> {
    const base = super.cloneObject(value);
    return { ...base, '__tag': 'cloned' };
  }
}

class SelectiveFrozen extends Frozen {
  protected static override shouldFreeze(value: object): boolean {
    const isFrozenTarget = ('mutable' in value) === false;
    return isFrozenTarget;
  }
}

class JsonCoreRunners {
  static 'clone-deep-array'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-deep-array'>): void {
    const original = JsonCoreRunners.readJson(scenarioCase.input).value;
    const cloned = Clone.deep(original);
    assert.deepEqual(cloned, scenarioCase.expected.cloned);
    assert.notStrictEqual(cloned, original);
    assert.notStrictEqual(ScenarioValues.requireArray(cloned, 'clone array result')[1], ScenarioValues.requireArray(original, 'clone array input')[1]);
  }

  static 'clone-deep-date'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-deep-date'>): void {
    const original = new Date(ScenarioValues.requireString(JsonCoreRunners.readJson(scenarioCase.input).value, 'clone date input'));
    const cloned: unknown = Clone.deep(original);
    assert.ok(cloned instanceof Date);
    assert.notStrictEqual(cloned, original);
    assert.equal(cloned.getTime(), original.getTime());
  }

  static 'clone-deep-isolation'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-deep-isolation'>): void {
    const original = ScenarioValues.requireRecord(JsonCoreRunners.readJson(scenarioCase.input).value, 'clone isolation input');
    const cloned = ScenarioValues.requireRecord(Clone.deep(original), 'clone isolation result');
    Reflect.set(ScenarioValues.requireRecord(cloned.b, 'clone isolation nested result'), 'c', 99);
    assert.equal(ScenarioValues.requireRecord(original.b, 'clone isolation nested input').c, 2);
  }

  static 'clone-deep-map'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-deep-map'>): void {
    const original = JsonCoreRunners.materializeMap(JsonCoreRunners.readJson(scenarioCase.input), 'value');
    const cloned: unknown = Clone.deep(original);
    assert.ok(cloned instanceof Map);
    assert.equal(cloned !== original, scenarioCase.expected.distinct);
    assert.equal(cloned.size, scenarioCase.expected.size);
    assert.deepEqual(cloned, original);
  }

  static 'clone-deep-nested-object'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-deep-nested-object'>): void {
    const original = ScenarioValues.requireRecord(JsonCoreRunners.readJson(scenarioCase.input).value, 'clone nested object input');
    const cloned = ScenarioValues.requireRecord(Clone.deep(original), 'clone nested object result');
    assert.deepEqual(cloned, scenarioCase.expected.cloned);
    assert.equal(cloned !== original, scenarioCase.expected.distinct);
    assert.notStrictEqual(cloned.b, original.b);
  }

  static 'clone-deep-null'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-deep-null'>): void {
    assert.equal(Clone.deep(JsonCoreRunners.readJson(scenarioCase.input).value), scenarioCase.expected.cloned);
  }

  static 'clone-deep-number'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-deep-number'>): void {
    assert.equal(Clone.deep(JsonCoreRunners.readJson(scenarioCase.input).value), scenarioCase.expected.cloned);
  }

  static 'clone-deep-set'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-deep-set'>): void {
    const original = JsonCoreRunners.materializeSet(JsonCoreRunners.readJson(scenarioCase.input), 'value');
    const cloned: unknown = Clone.deep(original);
    assert.ok(cloned instanceof Set);
    assert.equal(cloned !== original, scenarioCase.expected.distinct);
    const expectedValues = ScenarioValues.requireArray(scenarioCase.expected.has, 'clone set expected values');
    for (let index = 0; index < expectedValues.length; index += 1) {
      assert.ok(cloned.has(expectedValues[index]));
    }
    assert.deepEqual(cloned, original);
  }

  static 'clone-deep-string'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-deep-string'>): void {
    assert.equal(Clone.deep(JsonCoreRunners.readJson(scenarioCase.input).value), scenarioCase.expected.cloned);
  }

  static 'clone-shallow'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-shallow'>): void {
    const original = ScenarioValues.requireRecord(JsonCoreRunners.readJson(scenarioCase.input).value, 'clone shallow input');
    const cloned = ScenarioValues.requireRecord(Clone.shallow(original), 'clone shallow result');
    assert.notStrictEqual(cloned, original);
    assert.equal(cloned.a, 1);
    assert.equal(cloned.b === original.b, scenarioCase.expected.nestedShared);
  }

  static 'clone-subclass-base'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-subclass-base'>): void {
    const result = ScenarioValues.requireRecord(Clone.deep(JsonCoreRunners.readJson(scenarioCase.input).value), 'clone subclass base result');
    assert.equal(Reflect.get(result, '__tag') === 'cloned', scenarioCase.expected.tagged);
  }

  static 'clone-subclass-nested'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-subclass-nested'>): void {
    const result = ScenarioValues.requireRecord(TaggedClone.deep(JsonCoreRunners.readJson(scenarioCase.input).value), 'clone subclass nested result');
    assert.equal(Reflect.get(result, '__tag') === 'cloned', scenarioCase.expected.tagged);
    const nested = ScenarioValues.requireRecord(result.nested, 'clone subclass nested child');
    assert.equal(Reflect.get(nested, '__tag') === 'cloned', scenarioCase.expected.nestedTagged);
    assert.equal(nested.b, 2);
  }

  static 'clone-subclass-root'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'clone-subclass-root'>): void {
    const result = ScenarioValues.requireRecord(TaggedClone.deep(JsonCoreRunners.readJson(scenarioCase.input).value), 'clone subclass root result');
    assert.equal(Reflect.get(result, '__tag') === 'cloned', scenarioCase.expected.tagged);
    assert.equal(result.a, 1);
  }

  static 'data-cycle'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'data-cycle'>): void {
    assert.equal(Predicates.hasCycle({ 'a': 1, 'b': [2, 3] }), scenarioCase.expected.acyclic);
    const cyclicRecord: Record<string, unknown> = { 'a': 1 };
    cyclicRecord.self = cyclicRecord;
    assert.equal(Predicates.hasCycle(cyclicRecord), scenarioCase.expected.objectCycle);
    const cyclicList: unknown[] = [1, 2];
    cyclicList.push(cyclicList);
    assert.equal(Predicates.hasCycle(cyclicList), scenarioCase.expected.arrayCycle);
  }

  static 'data-deepequal-false'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'data-deepequal-false'>): void {
    const values = ScenarioValues.requireArray(JsonCoreRunners.readJson(scenarioCase.input).values, 'deepEqual false values');
    assert.equal(Predicates.areDeeplyEqual(values[0], values[1]), scenarioCase.expected.result);
    assert.equal(Predicates.areDeeplyEqual(values[2], values[3]), scenarioCase.expected.result);
  }

  static 'data-deepequal-negative-branches'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'data-deepequal-negative-branches'>): void {
    assert.deepEqual(JsonCoreRunners.readJson(scenarioCase.input).checks, ['array-size', 'array-value', 'object-size', 'object-missing']);
    const negativeChecks = [
      Predicates.areDeeplyEqual([1, 2], [1]),
      Predicates.areDeeplyEqual([1], [2]),
      Predicates.areDeeplyEqual({ 'a': 1, 'b': 2 }, { 'a': 1 }),
      Predicates.areDeeplyEqual({ 'a': 1 }, { 'b': 1 })
    ];
    const allNegativeChecksFail = negativeChecks.every((result) => {
      const isNegative = result === false;
      return isNegative;
    });
    assert.equal(allNegativeChecksFail, scenarioCase.expected.allNegativeChecksFail);
  }

  static 'data-deepequal-special'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'data-deepequal-special'>): void {
    const input = JsonCoreRunners.readJson(scenarioCase.input);
    const pairs = ScenarioValues.requireArray(ScenarioValues.requireProperty(input, 'pairs', 'input'), 'deepEqual special pairs');
    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[index];
      const record = ScenarioValues.requireRecord(pair, 'deepEqual special pair');
      const left = ScenarioValues.requireProperty(record, 'left', 'input');
      const right = ScenarioValues.requireProperty(record, 'right', 'input');
      assert.equal(Predicates.areDeeplyEqual(left, right), ScenarioValues.requireProperty(record, 'equal', 'input'));
    }
  }

  static 'data-deepequal-true'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'data-deepequal-true'>): void {
    const input = JsonCoreRunners.readJson(scenarioCase.input);
    const primitives = ScenarioValues.requireArray(ScenarioValues.requireProperty(input, 'primitives', 'input'), 'deepEqual true primitives');
    for (let index = 0; index < primitives.length; index += 1) {
      const value = primitives[index];
      assert.equal(Predicates.areDeeplyEqual(value, value), scenarioCase.expected.result);
    }
    const pairs = ScenarioValues.requireArray(ScenarioValues.requireProperty(input, 'pairs', 'input'), 'deepEqual true pairs');
    for (let index = 0; index < pairs.length; index += 1) {
      const record = ScenarioValues.requireRecord(pairs[index], 'deepEqual true pair');
      const left = ScenarioValues.requireProperty(record, 'left', 'input');
      const right = ScenarioValues.requireProperty(record, 'right', 'input');
      assert.notStrictEqual(left, right);
      assert.equal(Predicates.areDeeplyEqual(left, right), scenarioCase.expected.result);
    }
  }

  static 'data-plain-object'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'data-plain-object'>): void {
    assert.equal(Predicates.isPlainObject({}), scenarioCase.expected.plain);
    assert.equal(Predicates.isPlainObject({ 'a': 1 }), scenarioCase.expected.plain);
    const nullPrototypeRecord: unknown = Object.create(null);
    assert.equal(Predicates.isPlainObject(nullPrototypeRecord), scenarioCase.expected.plain);
    assert.equal(Predicates.isPlainObject([]), scenarioCase.expected.array);
    assert.equal(Predicates.isPlainObject(null), false);
    assert.equal(Predicates.isPlainObject(new Date()), scenarioCase.expected.date);
    assert.equal(Predicates.isPlainObject('string'), false);
  }

  static 'data-record'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'data-record'>): void {
    assert.equal(Predicates.isRecord({}), scenarioCase.expected.object);
    assert.equal(Predicates.isRecord(new Map<unknown, unknown>()), scenarioCase.expected.map);
    assert.equal(Predicates.isRecord([]), scenarioCase.expected.array);
    assert.equal(Predicates.isRecord(null), scenarioCase.expected.null);
  }

  static 'entities-core'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'entities-core'>): void {
    assert.equal(DraftNodeStateEntity.validate({ 'isArray': true }), true);
    assert.equal(DraftNodeStateEntity.validate({ 'isArray': 'yes' }), false);
    assert.equal(PatchApplyResultStatusEntity.validate({ 'success': true }), true);
    assert.equal(PatchApplyResultStatusEntity.validate({ 'error': 'failed', 'success': false }), true);
    assert.equal(PatchApplyResultStatusEntity.validate({}), false);
    assert.equal(PathWildcardResultEntity.validate({ 'isWildcard': true, 'remainingPath': ['items', 'name'] }), true);
    assert.equal(PathWildcardResultEntity.validate({ 'isWildcard': false, 'remainingPath': [] }), false);
    const entities = ScenarioValues.requireArray(JsonCoreRunners.readJson(scenarioCase.input).entities, 'entities-core entities');
    const ids: unknown[] = [];
    for (let index = 0; index < entities.length; index += 1) {
      ids.push(ScenarioValues.requireRecord(entities[index], 'entities-core entity').id);
    }
    assert.deepEqual(ids, scenarioCase.expected.ids);
  }

  static 'frozen-cycle'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'frozen-cycle'>): void {
    const cyclic = JsonCoreRunners.materializeSelfCycle(JsonCoreRunners.readJson(scenarioCase.input), 'value');
    assert.doesNotThrow(() => {
      const frozen = Frozen.deepFreeze(cyclic);
      return frozen;
    });
  }

  static 'frozen-flat'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'frozen-flat'>): void {
    assert.equal(Object.isFrozen(Frozen.deepFreeze(JsonCoreRunners.readJson(scenarioCase.input).value)), scenarioCase.expected.frozen);
  }

  static 'frozen-map-set'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'frozen-map-set'>): void {
    const input = JsonCoreRunners.readJson(scenarioCase.input);
    const map = JsonCoreRunners.materializeMap(input, 'map');
    const frozenMap = Frozen.deepFreeze(map);
    assert.throws(() => {
      const result = frozenMap.set('b', 2);
      return result;
    }, FrozenMutationError);
    assert.throws(() => {
      const result = frozenMap.delete('a');
      return result;
    }, FrozenMutationError);
    assert.throws(() => {
      const result = frozenMap.clear();
      return result;
    }, FrozenMutationError);
    assert.equal(frozenMap.get('a'), 1);
    const set = JsonCoreRunners.materializeSet(input, 'set');
    const frozenSet = Frozen.deepFreeze(set);
    assert.throws(() => {
      const result = frozenSet.add('b');
      return result;
    }, FrozenMutationError);
    assert.throws(() => {
      const result = frozenSet.delete('a');
      return result;
    }, FrozenMutationError);
    assert.throws(() => {
      const result = frozenSet.clear();
      return result;
    }, FrozenMutationError);
    assert.ok(frozenSet.has('a'));
  }

  static 'frozen-map-values'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'frozen-map-values'>): void {
    const map = JsonCoreRunners.materializeMap(JsonCoreRunners.readJson(scenarioCase.input), 'map');
    const frozen = Frozen.deepFreeze(map);
    assert.equal(Object.isFrozen(frozen.get('a')), scenarioCase.expected.nestedFrozen);
  }

  static 'frozen-nested'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'frozen-nested'>): void {
    const frozen = ScenarioValues.requireRecord(Frozen.deepFreeze(JsonCoreRunners.readJson(scenarioCase.input).value), 'frozen nested result');
    assert.equal(Object.isFrozen(frozen), scenarioCase.expected.frozen);
    assert.equal(Object.isFrozen(frozen.b), scenarioCase.expected.nestedFrozen);
  }

  static 'frozen-primitives'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'frozen-primitives'>): void {
    const values = ScenarioValues.requireArray(JsonCoreRunners.readJson(scenarioCase.input).values, 'frozen primitive values');
    for (let index = 0; index < values.length; index += 1) {
      const value = values[index];
      assert.equal(Frozen.deepFreeze(value), value);
    }
  }

  static 'frozen-reference'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'frozen-reference'>): void {
    const record = ScenarioValues.requireRecord(JsonCoreRunners.readJson(scenarioCase.input).value, 'frozen reference input');
    assert.equal(Frozen.deepFreeze(record), record);
  }

  static 'frozen-set-values'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'frozen-set-values'>): void {
    const set = JsonCoreRunners.cloneMembers(ScenarioValues.requireArray(JsonCoreRunners.readJson(scenarioCase.input).setValues, 'frozen set values'));
    const frozen = Frozen.deepFreeze(set);
    assert.equal(frozen.size, scenarioCase.expected.size);
    const first = frozen.values().next().value;
    assert.ok(first !== undefined);
    assert.equal(Object.isFrozen(first), scenarioCase.expected.nestedFrozen);
    assert.ok(frozen.has(first));
  }

  static 'frozen-subclass-skip'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'frozen-subclass-skip'>): void {
    const value = JsonCoreRunners.cloneValue(ScenarioValues.requireRecord(JsonCoreRunners.readJson(scenarioCase.input).value, 'frozen subclass input'));
    const frozen = SelectiveFrozen.deepFreeze(value);
    assert.strictEqual(frozen, value);
    assert.equal(Object.isFrozen(frozen), scenarioCase.expected.rootFrozen);
    assert.equal(Object.isFrozen(frozen.child), scenarioCase.expected.childFrozen);
  }

  static 'merge-hidden-class'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'merge-hidden-class'>): void {
    const input = JsonCoreRunners.readJson(scenarioCase.input);
    const first = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'first', 'input'), 'merge hidden class first');
    const second = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'second', 'input'), 'merge hidden class second');
    const r1 = Merge.deep(
      ScenarioValues.requireRecord(ScenarioValues.requireProperty(first, 'left', 'input'), 'merge hidden class first left'),
      ScenarioValues.requireRecord(ScenarioValues.requireProperty(first, 'right', 'input'), 'merge hidden class first right')
    );
    const r2 = Merge.deep(
      ScenarioValues.requireRecord(ScenarioValues.requireProperty(second, 'left', 'input'), 'merge hidden class second left'),
      ScenarioValues.requireRecord(ScenarioValues.requireProperty(second, 'right', 'input'), 'merge hidden class second right')
    );
    assert.deepEqual(Object.keys(r1), scenarioCase.expected.keyOrder);
    assert.deepEqual(Object.keys(r2), scenarioCase.expected.keyOrder);
  }

  static 'merge-isolation'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'merge-isolation'>): void {
    const input = JsonCoreRunners.readJson(scenarioCase.input);
    const base = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'left', 'input'), 'merge isolation left');
    const overlay = ScenarioValues.requireRecord(ScenarioValues.requireProperty(input, 'right', 'input'), 'merge isolation right');
    const baseSnapshot = JsonCoreRunners.cloneValue(base);
    const overlaySnapshot = JsonCoreRunners.cloneValue(overlay);
    const result = Merge.deep(base, overlay);
    const resultBaseOnly = result.baseOnly;
    const resultOverlayOnly = result.overlayOnly;
    const resultItems = ScenarioValues.requireArray(result.items, 'merge result items');
    assert.ok(typeof resultBaseOnly === 'object' && resultBaseOnly !== null);
    assert.ok(typeof resultOverlayOnly === 'object' && resultOverlayOnly !== null);
    Reflect.set(resultBaseOnly, 'count', 10);
    Reflect.set(resultOverlayOnly, 'count', 20);
    Reflect.set(resultItems, resultItems.length, { 'id': 3 });
    const firstResultItem = resultItems[0];
    assert.ok(typeof firstResultItem === 'object' && firstResultItem !== null);
    Reflect.set(firstResultItem, 'id', 20);
    assert.deepEqual(base, baseSnapshot);
    assert.deepEqual(overlay, overlaySnapshot);
  }

  static 'merge-primitives'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'merge-primitives'>): void {
    assert.deepEqual(Merge.deep({ 'a': 1, 'b': 2 }, { 'b': 99 }), { 'a': 1, 'b': 99 });
    assert.deepEqual(Merge.deep({ 'a': 1, 'b': 2 }, { 'c': 3 }), { 'a': 1, 'b': 2, 'c': 3 });
    assert.deepEqual(Merge.deep({ 'list': [1, 2, 3] }, { 'list': [4, 5] }), { 'list': [4, 5] });
    assert.equal(Merge.deep(JsonCoreRunners.readJson(scenarioCase.input).left, JsonCoreRunners.readJson(scenarioCase.input).right), scenarioCase.expected.merged);
  }

  static 'sort-functions'(scenarioCase: ScenarioCaseOfType<JsonCoreScenarioCaseEntity.Type, 'sort-functions'>): void {
    assert.deepEqual(['file1', 'file10', 'file2', 'file20'].toSorted(Sort.natural), ['file1', 'file2', 'file10', 'file20']);
    assert.deepEqual(['banana', 'apple', 'cherry'].toSorted(Sort.natural), ['apple', 'banana', 'cherry']);
    assert.deepEqual(['property', 'id', 'type', 'name'].toSorted(Sort.shortestFirst), ['id', 'name', 'type', 'property']);
    assert.equal(Sort.shortestFirst('abc', 'abc'), 0);
    assert.deepEqual(['id', 'type', 'property', 'name'].toSorted(Sort.longestFirst), ['property', 'type', 'name', 'id']);
    assert.equal(Sort.longestFirst('abc', 'de'), Sort.shortestFirst('de', 'abc'));
    const sortValues = ScenarioValues.requireArray(JsonCoreRunners.readJson(scenarioCase.input).values, 'sort values');
    assert.deepEqual(sortValues.toSorted(JsonCoreRunners.compareAscending), scenarioCase.expected.ascending);
    assert.deepEqual(sortValues.toSorted(JsonCoreRunners.compareDescending), scenarioCase.expected.descending);
  }

  private static cloneValue<TValue>(value: TValue): TValue {
    try {
      const cloned = structuredClone(value);
      return cloned;
    } catch (cause) {
      throw RuntimeError.create('Scenario value is not structured-cloneable', { 'cause': cause });
    }
  }

  private static cloneMembers(values: readonly unknown[]): Set<unknown> {
    const members = new Set<unknown>();
    for (let index = 0; index < values.length; index += 1) {
      members.add(JsonCoreRunners.cloneValue(values[index]));
    }

    return members;
  }

  private static compareAscending(left: unknown, right: unknown): number {
    const difference = Number(left) - Number(right);
    return difference;
  }

  private static compareDescending(left: unknown, right: unknown): number {
    const difference = Number(right) - Number(left);
    return difference;
  }

  private static materializeSelfCycle(json: Readonly<Record<string, unknown>>, key: string): Record<string, unknown> {
    const result = JsonCoreRunners.cloneValue(ScenarioValues.requireRecord(ScenarioValues.requireProperty(json, key, 'json'), 'cycle descriptor'));
    if (result.self === 'cycle') {
      Reflect.set(result, 'self', result);
    }

    return result;
  }

  private static materializeMap(json: Readonly<Record<string, unknown>>, key: string): Map<unknown, unknown> {
    const descriptor = ScenarioValues.requireRecord(ScenarioValues.requireProperty(json, key, 'json'), 'map descriptor');
    const entries = ScenarioValues.requireArray(descriptor.entries, 'map descriptor entries');
    const materializedEntries: [unknown, unknown][] = [];
    for (let index = 0; index < entries.length; index += 1) {
      const pair = ScenarioValues.requireArray(entries[index], 'map descriptor entry');
      materializedEntries.push([pair[0], pair[1]]);
    }

    return new Map(materializedEntries);
  }

  private static materializeSet(json: Readonly<Record<string, unknown>>, key: string): Set<unknown> {
    const descriptor = ScenarioValues.requireRecord(ScenarioValues.requireProperty(json, key, 'json'), 'set descriptor');
    const members = JsonCoreRunners.cloneMembers(ScenarioValues.requireArray(descriptor.values, 'set descriptor values'));
    return members;
  }

  private static readJson(input: { readonly 'json': Readonly<Record<string, unknown>> }): Record<string, unknown> {
    const json = ScenarioValues.requireRecord(input.json, 'input.json');
    return json;
  }
}

ScenarioSuite.register({
  'entity': JsonCoreScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'JSON core',
  'runners': JsonCoreRunners
});

void describe('Clone.deep runtime containers', () => {
  void it('clones a Map and deeply isolates its values', () => {
    const original = new Map([['settings', { 'enabled': true }]]);
    const cloned = Clone.deep(original);
    const originalSettings = original.get('settings');
    const clonedSettings = cloned.get('settings');

    if (originalSettings === undefined || clonedSettings === undefined) {
      throw RuntimeError.create('Expected Map settings value');
    }

    assert.notStrictEqual(cloned, original);
    assert.notStrictEqual(clonedSettings, originalSettings);
    clonedSettings.enabled = false;
    cloned.set('new-settings', { 'enabled': false });
    assert.equal(originalSettings.enabled, true);
    assert.equal(original.has('new-settings'), false);
  });

  void it('clones a Set and deeply isolates its members', () => {
    const originalMember = { 'count': 1 };
    const original = new Set([originalMember]);
    const cloned = Clone.deep(original);
    const clonedMember = cloned.values().next().value;

    if (clonedMember === undefined) {
      throw RuntimeError.create('Expected cloned Set member');
    }

    assert.notStrictEqual(cloned, original);
    assert.notStrictEqual(clonedMember, originalMember);
    clonedMember.count = 2;
    cloned.add({ 'count': 3 });
    assert.equal(originalMember.count, 1);
    assert.equal(original.size, 1);
  });

  void it('clones a Date by timestamp', () => {
    const original = new Date('2024-06-01T12:30:00.000Z');
    const cloned = Clone.deep(original);

    assert.notStrictEqual(cloned, original);
    assert.equal(cloned.getTime(), original.getTime());
  });

  void it('clones nested objects, arrays, Maps, Sets, and Dates', () => {
    const originalDate = new Date('2024-06-01T12:30:00.000Z');
    const originalMember = { 'name': 'primary' };
    const original = {
      'root': {
        'items': [{
          'calendar': new Map([['next', { 'at': originalDate }]]),
          'members': new Set([originalMember])
        }]
      }
    };
    const cloned = Clone.deep(original);
    const originalItem = original.root.items[0];
    const clonedItem = cloned.root.items[0];
    if (originalItem === undefined || clonedItem === undefined) {
      throw RuntimeError.create('Expected nested clone items');
    }
    const originalAppointment = originalItem.calendar.get('next');
    const clonedAppointment = clonedItem.calendar.get('next');
    const clonedMember = clonedItem.members.values().next().value;

    if (originalAppointment === undefined || clonedAppointment === undefined || clonedMember === undefined) {
      throw RuntimeError.create('Expected nested clone values');
    }

    assert.notStrictEqual(cloned, original);
    assert.notStrictEqual(cloned.root, original.root);
    assert.notStrictEqual(clonedItem, originalItem);
    assert.notStrictEqual(clonedItem.calendar, originalItem.calendar);
    assert.notStrictEqual(clonedItem.members, originalItem.members);
    assert.notStrictEqual(clonedAppointment.at, originalAppointment.at);
    assert.equal(clonedAppointment.at.getTime(), originalAppointment.at.getTime());
    assert.notStrictEqual(clonedMember, originalMember);
  });

  void it('preserves the static type of generic values', () => {
    const original: { readonly 'id': string; readonly 'state': { readonly 'enabled': boolean } } = { 'id': 'value-1', 'state': { 'enabled': true } };
    const cloned: { readonly 'id': string; readonly 'state': { readonly 'enabled': boolean } } = Clone.deep(original);
    const untrustedInput: unknown = { 'id': 'untrusted-1' };
    const untrustedClone: unknown = Clone.deep(untrustedInput);

    assert.equal(cloned.id, original.id);
    assert.notStrictEqual(cloned.state, original.state);
    assert.deepEqual(untrustedClone, untrustedInput);
  });
});

void describe('Clone.deep RegExp and custom values', () => {
  void it('clones RegExp values and preserves unsupported custom-object identity', () => {
    class CustomValue {
      public readonly nested = { 'state': 'original' };
    }

    const expression = new RegExp(VALUE_PATTERN, 'giu');
    expression.lastIndex = 2;
    const expressionClone = Clone.deep(expression);
    const customValue = new CustomValue();
    const customClone = Clone.deep(customValue);

    assert.ok(Predicates.isRegExp(expressionClone));
    assert.notStrictEqual(expressionClone, expression);
    assert.equal(expressionClone.source, expression.source);
    assert.equal(expressionClone.flags, expression.flags);
    assert.equal(expressionClone.lastIndex, expression.lastIndex);
    assert.strictEqual(customClone, customValue);
  });
});

void describe('Frozen nested collection protection', () => {
  void it('retains guarded Map and Set references in frozen parent containers', () => {
    const source = {
      'collection': new Map<unknown, unknown>([['members', new Set<unknown>([{ 'id': 1 }])]])
    };
    const frozen = Frozen.deepFreeze(source);
    const nestedSet = frozen.collection.get('members');

    assert.throws(() => {
      const result = frozen.collection.set('other', 1);
      return result;
    }, FrozenMutationError);
    assert.ok(nestedSet instanceof Set);
    assert.throws(() => {
      const result = nestedSet.add({ 'id': 2 });
      return result;
    }, FrozenMutationError);
  });

  void it('detaches Map and Set snapshots from caller-held collection aliases', () => {
    const sourceMap = new Map<string, unknown>([['member', { 'id': 1 }]]);
    const sourceSet = new Set<unknown>(['member']);
    const frozenMap = Frozen.deepFreeze(sourceMap);
    const frozenSet = Frozen.deepFreeze(sourceSet);

    sourceMap.set('late', { 'id': 2 });
    sourceMap.delete('member');
    sourceSet.add('late');
    sourceSet.delete('member');

    assert.equal(frozenMap.size, 1);
    assert.ok(frozenMap.has('member'));
    assert.equal(frozenSet.size, 1);
    assert.ok(frozenSet.has('member'));
    assert.throws(() => {
      const result = frozenMap.set('other', 3);
      return result;
    }, FrozenMutationError);
    assert.throws(() => {
      const result = frozenSet.add('other');
      return result;
    }, FrozenMutationError);
  });

  void it('preserves guarded collection references through a cyclic object graph', () => {
    const collection = new Map<unknown, unknown>();
    const source: Record<string, unknown> = { 'collection': collection };
    collection.set('parent', source);

    const frozen = Frozen.deepFreeze(source);
    const frozenCollection = frozen.collection;
    assert.ok(frozenCollection instanceof Map);
    assert.throws(() => {
      const result = frozenCollection.set('other', 1);
      return result;
    }, FrozenMutationError);
    assert.strictEqual(frozenCollection.get('parent'), frozen);
  });
});

void describe('restored value-utility runtime contracts', () => {
  void it('compares NaN, Date, RegExp, Map, and Set values structurally', () => {
    const untrusted: unknown = Number.NaN;
    assert.equal(Predicates.areDeeplyEqual(untrusted, untrusted), true);
    assert.equal(Predicates.areDeeplyEqual(Number.NaN, Number.NaN), true);
    assert.equal(Predicates.areDeeplyEqual(new Date(1), new Date(1)), true);
    assert.equal(Predicates.areDeeplyEqual(new Date(1), new Date(2)), false);
    assert.equal(Predicates.areDeeplyEqual(new Date(1), {}), false);
    assert.equal(Predicates.areDeeplyEqual(new RegExp(VALUE_PATTERN, 'giu'), new RegExp(VALUE_PATTERN, 'giu')), true);
    assert.equal(Predicates.areDeeplyEqual(new RegExp(VALUE_PATTERN, 'gu'), new RegExp(OTHER_PATTERN, 'gu')), false);
    assert.equal(Predicates.areDeeplyEqual(new RegExp(VALUE_PATTERN, 'gu'), {}), false);
    assert.equal(Predicates.areDeeplyEqual(new Set(['a', 'b']), new Set(['a', 'b'])), true);
    assert.equal(Predicates.areDeeplyEqual(new Set(['a']), new Set(['b'])), false);
    assert.equal(Predicates.areDeeplyEqual(new Map([['item', { 'count': 1 }]]), new Map([['item', { 'count': 1 }]])), true);
    assert.equal(Predicates.areDeeplyEqual(new Map([['item', 1]]), new Map([['item', 2]])), false);
  });

  void it('keeps non-plain merge overlays atomic', () => {
    const date = new Date(1);
    assert.strictEqual(Merge.deep({ 'value': 1 }, date), date);
  });
});
