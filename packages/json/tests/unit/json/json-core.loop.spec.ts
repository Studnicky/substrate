import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  Clone,
  DataType,
  Frozen,
  FrozenMutationError,
  Hash,
  Merge,
  SchemaValidator,
  Sort,
  StructuralHash
} from '../../../src/index.js';
import {
  DraftNodeStateEntity,
  PatchApplyResultStatusEntity,
  PathWildcardResultEntity
} from '../../../src/entities/index.js';

import scenarioGroups from './json-core.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'clone-deep-array'
  | 'clone-deep-date'
  | 'clone-deep-isolation'
  | 'clone-deep-map'
  | 'clone-deep-nested-object'
  | 'clone-deep-null'
  | 'clone-deep-number'
  | 'clone-deep-set'
  | 'clone-deep-string'
  | 'clone-shallow'
  | 'clone-subclass-base'
  | 'clone-subclass-nested'
  | 'clone-subclass-root'
  | 'data-cycle'
  | 'data-deepequal-false'
  | 'data-deepequal-negative-branches'
  | 'data-deepequal-special'
  | 'data-deepequal-true'
  | 'data-plain-object'
  | 'data-record'
  | 'entities-core'
  | 'frozen-cycle'
  | 'frozen-flat'
  | 'frozen-map-set'
  | 'frozen-map-values'
  | 'frozen-nested'
  | 'frozen-primitives'
  | 'frozen-reference'
  | 'frozen-set-values'
  | 'frozen-subclass-skip'
  | 'hash-different'
  | 'hash-distinct-shapes'
  | 'hash-edge-values'
  | 'hash-hex'
  | 'hash-identical'
  | 'hash-nested'
  | 'hash-order'
  | 'hash-primitive'
  | 'merge-hidden-class'
  | 'merge-isolation'
  | 'merge-primitives'
  | 'schema-validator'
  | 'sort-functions'
  | 'structural-hash-different'
  | 'structural-hash-metadata';

type JsonObject = Record<string, unknown>;
type ImportedScenarioCase = (typeof scenarioGroups.cases)[number];
type ScenarioCase = {
  description: string;
  expected: JsonObject;
  input: { json: JsonObject };
  shape: ScenarioShape;
  name: string;
};
type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

type CloneValue = PropertyKey | bigint | boolean | object | null | undefined;

class TaggedClone extends Clone {
  protected static override cloneObject(value: Record<string, CloneValue>): Record<string, CloneValue> {
    const base = super.cloneObject(value);
    return { ...base, '__tag': 'cloned' };
  }
}

class SelectiveFrozen extends Frozen {
  protected static override shouldFreeze(value: object): boolean {
    return !('mutable' in value);
  }
}

const runtimeValueByShape = {
  array: (): unknown[] => [1, 2],
  date: (): Date => new Date(0),
  false: (): boolean => false,
  function: (): (() => string) => () => 'hashable',
  map: (): Map<string, number> => new Map([['a', 1]]),
  null: (): null => null,
  number: (): number => 1,
  object: (): Record<string, never> => ({}),
  set: (): Set<string> => new Set(['a']),
  string: (): string => 'value',
  true: (): boolean => true,
  undefined: (): undefined => undefined
} satisfies Record<string, () => unknown>;

const scenarioRunnerMap = {
  'clone-deep-number': (scenarioCase) => {
    assert.equal(Clone.deep(readJson(scenarioCase).value), scenarioCase.expected.cloned);
  },

  'clone-deep-string': (scenarioCase) => {
    assert.equal(Clone.deep(readJson(scenarioCase).value), scenarioCase.expected.cloned);
  },

  'clone-deep-null': (scenarioCase) => {
    assert.equal(Clone.deep(readJson(scenarioCase).value), scenarioCase.expected.cloned);
  },

  'clone-deep-array': (scenarioCase) => {
    const original = readJson(scenarioCase).value;
    const cloned = Clone.deep(original);
    assert.deepEqual(cloned, scenarioCase.expected.cloned);
    assert.notStrictEqual(cloned, original);
    assert.notStrictEqual(requireArray(cloned, 'clone array result')[1], requireArray(original, 'clone array input')[1]);
  },

  'clone-deep-nested-object': (scenarioCase) => {
    const original = requireJsonObject(readJson(scenarioCase).value, 'clone nested object input');
    const cloned = requireJsonObject(Clone.deep(original), 'clone nested object result');
    assert.deepEqual(cloned, scenarioCase.expected.cloned);
    assert.equal(cloned !== original, scenarioCase.expected.distinct);
    assert.notStrictEqual(cloned.b, original.b);
  },

  'clone-deep-map': (scenarioCase) => {
    const original = materializeMap(readJson(scenarioCase).value);
    const cloned = requireMap(Clone.deep(original), 'clone map result');
    assert.equal(cloned !== original, scenarioCase.expected.distinct);
    assert.equal(cloned.size, scenarioCase.expected.size);
    assert.deepEqual(cloned, original);
  },

  'clone-deep-set': (scenarioCase) => {
    const original = materializeSet(readJson(scenarioCase).value);
    const cloned = requireSet(Clone.deep(original), 'clone set result');
    assert.equal(cloned !== original, scenarioCase.expected.distinct);
    for (const value of requireArray(scenarioCase.expected.has, 'clone set expected values')) assert.ok(cloned.has(value));
    assert.deepEqual(cloned, original);
  },

  'clone-deep-date': (scenarioCase) => {
    const original = new Date(requireString(readJson(scenarioCase).value, 'clone date input'));
    const cloned = requireDate(Clone.deep(original), 'clone date result');
    assert.notStrictEqual(cloned, original);
    assert.equal(cloned.getTime(), original.getTime());
  },

  'clone-deep-isolation': (scenarioCase) => {
    const original = requireJsonObject(readJson(scenarioCase).value, 'clone isolation input');
    const cloned = requireJsonObject(Clone.deep(original), 'clone isolation result');
    Reflect.set(requireJsonObject(cloned.b, 'clone isolation nested result'), 'c', 99);
    assert.equal(requireJsonObject(original.b, 'clone isolation nested input').c, 2);
  },

  'clone-shallow': (scenarioCase) => {
    const original = requireJsonObject(readJson(scenarioCase).value, 'clone shallow input');
    const cloned = requireJsonObject(Clone.shallow(original), 'clone shallow result');
    assert.notStrictEqual(cloned, original);
    assert.equal(cloned.a, 1);
    assert.equal(cloned.b === original.b, scenarioCase.expected.nestedShared);
  },

  'clone-subclass-root': (scenarioCase) => {
    const result = requireJsonObject(TaggedClone.deep(readJson(scenarioCase).value), 'clone subclass root result');
    assert.equal(Reflect.get(result, '__tag') === 'cloned', scenarioCase.expected.tagged);
    assert.equal(result.a, 1);
  },

  'clone-subclass-nested': (scenarioCase) => {
    const result = requireJsonObject(TaggedClone.deep(readJson(scenarioCase).value), 'clone subclass nested result');
    assert.equal(Reflect.get(result, '__tag') === 'cloned', scenarioCase.expected.tagged);
    const nested = requireJsonObject(result.nested, 'clone subclass nested child');
    assert.equal(Reflect.get(nested, '__tag') === 'cloned', scenarioCase.expected.nestedTagged);
    assert.equal(nested.b, 2);
  },

  'clone-subclass-base': (scenarioCase) => {
    const result = requireJsonObject(Clone.deep(readJson(scenarioCase).value), 'clone subclass base result');
    assert.equal(Reflect.get(result, '__tag') === 'cloned', scenarioCase.expected.tagged);
  },

  'data-deepequal-true': (scenarioCase) => {
    const input = readJson(scenarioCase);
    for (const value of requireArray(requiredValue(input, 'primitives'), 'deepEqual true primitives')) {
      assert.equal(DataType.deepEqual(value, value), scenarioCase.expected.result);
    }
    for (const pair of requireArray(requiredValue(input, 'pairs'), 'deepEqual true pairs')) {
      const record = requireJsonObject(pair, 'deepEqual true pair');
      const left = requiredValue(record, 'left');
      const right = requiredValue(record, 'right');
      assert.notStrictEqual(left, right);
      assert.equal(DataType.deepEqual(left, right), scenarioCase.expected.result);
    }
  },

  'data-deepequal-false': (scenarioCase) => {
    const values = requireArray(readJson(scenarioCase).values, 'deepEqual false values');
    assert.equal(DataType.deepEqual(values[0], values[1]), scenarioCase.expected.result);
    assert.equal(DataType.deepEqual(values[2], values[3]), scenarioCase.expected.result);
  },

  'data-deepequal-special': (scenarioCase) => {
    const input = readJson(scenarioCase);
    for (const pair of requireArray(requiredValue(input, 'pairs'), 'deepEqual special pairs')) {
      const record = requireJsonObject(pair, 'deepEqual special pair');
      const left = requiredValue(record, 'left');
      const right = requiredValue(record, 'right');
      assert.equal(DataType.deepEqual(left, right), requiredValue(record, 'equal'));
    }
  },

  'data-plain-object': (scenarioCase) => {
    assert.equal(DataType.isPlainObject({}), scenarioCase.expected.plain);
    assert.equal(DataType.isPlainObject({ a: 1 }), scenarioCase.expected.plain);
    assert.equal(DataType.isPlainObject(Object.create(null)), scenarioCase.expected.plain);
    assert.equal(DataType.isPlainObject([]), scenarioCase.expected.array);
    assert.equal(DataType.isPlainObject(null), false);
    assert.equal(DataType.isPlainObject(new Date()), scenarioCase.expected.date);
    assert.equal(DataType.isPlainObject('string'), false);
  },

  'data-record': (scenarioCase) => {
    assert.equal(DataType.isRecord({}), scenarioCase.expected.object);
    assert.equal(DataType.isRecord(new Map()), scenarioCase.expected.map);
    assert.equal(DataType.isRecord([]), scenarioCase.expected.array);
    assert.equal(DataType.isRecord(null), scenarioCase.expected.null);
  },

  'data-cycle': (scenarioCase) => {
    assert.equal(DataType.hasCycle({ a: 1, b: [2, 3] }), scenarioCase.expected.acyclic);
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    assert.equal(DataType.hasCycle(obj), scenarioCase.expected.objectCycle);
    const arr: unknown[] = [1, 2];
    arr.push(arr);
    assert.equal(DataType.hasCycle(arr), scenarioCase.expected.arrayCycle);
  },

  'data-deepequal-negative-branches': (scenarioCase) => {
    assert.deepEqual(readJson(scenarioCase).checks, ['array-size', 'array-value', 'object-size', 'object-missing']);
    const negativeChecks = [
      DataType.deepEqual([1, 2], [1]),
      DataType.deepEqual([1], [2]),
      DataType.deepEqual({ a: 1, b: 2 }, { a: 1 }),
      DataType.deepEqual({ a: 1 }, { b: 1 })
    ];
    assert.equal(negativeChecks.every((result) => result === false), scenarioCase.expected.allNegativeChecksFail);
  },

  'frozen-flat': (scenarioCase) => {
    assert.equal(Object.isFrozen(Frozen.deepFreeze(readJson(scenarioCase).value)), scenarioCase.expected.frozen);
  },

  'frozen-nested': (scenarioCase) => {
    const frozen = requireJsonObject(Frozen.deepFreeze(readJson(scenarioCase).value), 'frozen nested result');
    assert.equal(Object.isFrozen(frozen), scenarioCase.expected.frozen);
    assert.equal(Object.isFrozen(frozen.b), scenarioCase.expected.nestedFrozen);
  },

  'frozen-reference': (scenarioCase) => {
    const obj = requireJsonObject(readJson(scenarioCase).value, 'frozen reference input');
    assert.equal(Frozen.deepFreeze(obj), obj);
  },

  'frozen-cycle': (scenarioCase) => {
    const obj = materializeCycle(readJson(scenarioCase).value);
    assert.doesNotThrow(() => Frozen.deepFreeze(obj));
  },

  'frozen-primitives': (scenarioCase) => {
    for (const value of requireArray(readJson(scenarioCase).values, 'frozen primitive values')) {
      assert.equal(Frozen.deepFreeze(value), value);
    }
  },

  'frozen-map-set': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const map = materializeMap(input.map);
    const frozenMap = Frozen.deepFreeze(map);
    assert.throws(() => frozenMap.set('b', 2), FrozenMutationError);
    assert.throws(() => frozenMap.delete('a'), FrozenMutationError);
    assert.throws(() => frozenMap.clear(), FrozenMutationError);
    assert.equal(frozenMap.get('a'), 1);
    const set = materializeSet(input.set);
    const frozenSet = Frozen.deepFreeze(set);
    assert.throws(() => frozenSet.add('b'), FrozenMutationError);
    assert.throws(() => frozenSet.delete('a'), FrozenMutationError);
    assert.throws(() => frozenSet.clear(), FrozenMutationError);
    assert.ok(frozenSet.has('a'));
  },

  'frozen-map-values': (scenarioCase) => {
    const map = materializeMap(readJson(scenarioCase).map);
    const frozen = Frozen.deepFreeze(map);
    assert.equal(Object.isFrozen(frozen.get('a')), scenarioCase.expected.nestedFrozen);
  },

  'frozen-set-values': (scenarioCase) => {
    const set = new Set(requireArray(readJson(scenarioCase).setValues, 'frozen set values').map((value) => structuredClone(value)));
    const frozen = Frozen.deepFreeze(set);
    assert.equal(frozen.size, scenarioCase.expected.size);
    const first = frozen.values().next().value;
    assert.ok(first !== undefined);
    assert.equal(Object.isFrozen(first), scenarioCase.expected.nestedFrozen);
    assert.ok(frozen.has(first));
  },

  'frozen-subclass-skip': (scenarioCase) => {
    const value = cloneJsonObject(readJson(scenarioCase).value, 'frozen subclass input');
    const frozen = SelectiveFrozen.deepFreeze(value);
    assert.strictEqual(frozen, value);
    assert.equal(Object.isFrozen(frozen), scenarioCase.expected.rootFrozen);
    assert.equal(Object.isFrozen(frozen.child), scenarioCase.expected.childFrozen);
  },

  'hash-hex': (scenarioCase) => {
    assert.match(Hash.value(readJson(scenarioCase).value), /^[0-9a-f]{8}$/u);
  },

  'hash-identical': (scenarioCase) => {
    const values = requireArray(readJson(scenarioCase).values, 'hash identical values');
    assert.equal(Hash.value(values[0]), Hash.value(values[1]));
  },

  'hash-order': (scenarioCase) => {
    const values = requireArray(readJson(scenarioCase).values, 'hash order values');
    assert.equal(Hash.value(values[0]), Hash.value(values[1]));
  },

  'hash-different': (scenarioCase) => {
    const values = requireArray(readJson(scenarioCase).values, 'hash different values');
    assert.equal(Hash.value(values[0]) === Hash.value(values[1]), scenarioCase.expected.sameHash);
    assert.notEqual(Hash.value([1, 2]), Hash.value([1, 3]));
  },

  'hash-primitive': (scenarioCase) => {
    assert.equal(typeof Hash.value(readJson(scenarioCase).value), 'string');
  },

  'hash-nested': (scenarioCase) => {
    const value = readJson(scenarioCase).value;
    const changed = { a: { b: { c: 2 } } };
    assert.notEqual(Hash.value(value), Hash.value(changed));
  },

  'hash-distinct-shapes': (scenarioCase) => {
    const hashes = requireArray(readJson(scenarioCase).values, 'hash distinct value shapes').map((shape) => {
      return Hash.value(materializeRuntimeValue(requireString(shape, 'hash distinct value shape')));
    });
    assert.equal(new Set(hashes).size === hashes.length, scenarioCase.expected.distinct);
  },

  'structural-hash-metadata': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = requireJsonObject(requiredValue(input, 'base'), 'structural hash metadata base');
    const metadataVariant = requireJsonObject(requiredValue(input, 'metadataVariant'), 'structural hash metadata variant');
    assert.equal(StructuralHash.of(base), StructuralHash.of(metadataVariant));
  },

  'structural-hash-different': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = requireJsonObject(requiredValue(input, 'base'), 'structural hash different base');
    const variant = requireJsonObject(requiredValue(input, 'variant'), 'structural hash different variant');
    assert.notEqual(StructuralHash.of(base), StructuralHash.of(variant));
  },

  'hash-edge-values': (scenarioCase) => {
    const [trueShape, falseShape, nullShape, stringShape] = requireArray(readJson(scenarioCase).values, 'hash edge values')
      .map((shape) => requireString(shape, 'hash edge value shape'));
    assert.equal(Hash.value(materializeRuntimeValue(trueShape!)) !== Hash.value(materializeRuntimeValue(falseShape!)), scenarioCase.expected.booleanDistinct);
    assert.equal(Hash.value(materializeRuntimeValue(nullShape!)) !== Hash.value(materializeRuntimeValue(stringShape!)), scenarioCase.expected.nullDistinctFromString);
  },

  'merge-primitives': (scenarioCase) => {
    assert.deepEqual(Merge.deep({ a: 1, b: 2 }, { b: 99 }), { a: 1, b: 99 });
    assert.deepEqual(Merge.deep({ a: 1, b: 2 }, { c: 3 }), { a: 1, b: 2, c: 3 });
    assert.deepEqual(Merge.deep({ arr: [1, 2, 3] }, { arr: [4, 5] }), { arr: [4, 5] });
    assert.equal(Merge.deep(readJson(scenarioCase).left, readJson(scenarioCase).right), scenarioCase.expected.merged);
  },

  'merge-isolation': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const base = requireJsonObject(requiredValue(input, 'left'), 'merge isolation left');
    const overlay = requireJsonObject(requiredValue(input, 'right'), 'merge isolation right');
    const baseSnapshot = structuredClone(base);
    const overlaySnapshot = structuredClone(overlay);
    const result = Merge.deep(base, overlay);
    const resultBaseOnly = result.baseOnly;
    const resultOverlayOnly = result.overlayOnly;
    const resultItems = result.items;
    assert.ok(typeof resultBaseOnly === 'object' && resultBaseOnly !== null);
    assert.ok(typeof resultOverlayOnly === 'object' && resultOverlayOnly !== null);
    assert.ok(Array.isArray(resultItems));
    Reflect.set(resultBaseOnly, 'count', 10);
    Reflect.set(resultOverlayOnly, 'count', 20);
    resultItems.push({ id: 3 });
    const firstResultItem = resultItems[0];
    assert.ok(typeof firstResultItem === 'object' && firstResultItem !== null);
    Reflect.set(firstResultItem, 'id', 20);
    assert.deepEqual(base, baseSnapshot);
    assert.deepEqual(overlay, overlaySnapshot);
  },

  'merge-hidden-class': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const first = requireJsonObject(requiredValue(input, 'first'), 'merge hidden class first');
    const second = requireJsonObject(requiredValue(input, 'second'), 'merge hidden class second');
    const r1 = Merge.deep(
      requireJsonObject(requiredValue(first, 'left'), 'merge hidden class first left'),
      requireJsonObject(requiredValue(first, 'right'), 'merge hidden class first right')
    );
    const r2 = Merge.deep(
      requireJsonObject(requiredValue(second, 'left'), 'merge hidden class second left'),
      requireJsonObject(requiredValue(second, 'right'), 'merge hidden class second right')
    );
    assert.deepEqual(Object.keys(r1), scenarioCase.expected.keyOrder);
    assert.deepEqual(Object.keys(r2), scenarioCase.expected.keyOrder);
  },

  'sort-functions': (scenarioCase) => {
    assert.deepEqual(['file1', 'file10', 'file2', 'file20'].toSorted(Sort.natural), ['file1', 'file2', 'file10', 'file20']);
    assert.deepEqual(['banana', 'apple', 'cherry'].toSorted(Sort.natural), ['apple', 'banana', 'cherry']);
    assert.deepEqual(['property', 'id', 'type', 'name'].toSorted(Sort.shortestFirst), ['id', 'name', 'type', 'property']);
    assert.equal(Sort.shortestFirst('abc', 'abc'), 0);
    assert.deepEqual(['id', 'type', 'property', 'name'].toSorted(Sort.longestFirst), ['property', 'type', 'name', 'id']);
    assert.equal(Sort.longestFirst('abc', 'de'), Sort.shortestFirst('de', 'abc'));
    assert.deepEqual(requireArray(readJson(scenarioCase).values, 'sort values').toSorted((left, right) => Number(left) - Number(right)), scenarioCase.expected.ascending);
    assert.deepEqual(requireArray(readJson(scenarioCase).values, 'sort values').toSorted((left, right) => Number(right) - Number(left)), scenarioCase.expected.descending);
  },

  'entities-core': (scenarioCase) => {
    assert.equal(DraftNodeStateEntity.validate({ isArray: true }), true);
    assert.equal(DraftNodeStateEntity.validate({ isArray: 'yes' }), false);
    assert.equal(PatchApplyResultStatusEntity.validate({ success: true }), true);
    assert.equal(PatchApplyResultStatusEntity.validate({ error: 'failed', success: false }), true);
    assert.equal(PatchApplyResultStatusEntity.validate({}), false);
    assert.equal(PathWildcardResultEntity.validate({ isWildcard: true, remainingPath: ['items', 'name'] }), true);
    assert.equal(PathWildcardResultEntity.validate({ isWildcard: false, remainingPath: [] }), false);
    const entities = requireArray(readJson(scenarioCase).entities, 'entities-core entities');
    const ids = entities.map((entity) => requireJsonObject(entity, 'entities-core entity').id);
    assert.deepEqual(ids, scenarioCase.expected.ids);
  },

  'schema-validator': (scenarioCase) => {
    const input = readJson(scenarioCase);
    const schema = requireJsonObject(input.schema, 'schema-validator schema');
    const first = SchemaValidator.compile<Record<string, unknown>>(schema);
    const second = SchemaValidator.compile<Record<string, unknown>>(schema);
    assert.equal(first === second, scenarioCase.expected.idempotent);
    assert.equal(first(input.valid), true);
    assert.equal(first(input.invalid), false);
    const formatted = SchemaValidator.formatErrors(first.errors);
    for (const expectedText of requireArray(scenarioCase.expected.formattedIncludes, 'schema formatted includes')) {
      assert.ok(formatted.includes(requireString(expectedText, 'schema formatted include')));
    }
    assert.equal(SchemaValidator.formatErrors(null), scenarioCase.expected.fallback);
    assert.equal(SchemaValidator.formatErrors(undefined), scenarioCase.expected.fallback);
    assert.equal(SchemaValidator.formatErrors([]), scenarioCase.expected.fallback);
  }
} satisfies Record<ScenarioShape, ScenarioRunner>;

const scenarioCases = scenarioGroups.cases.map(normalizeScenarioCase);

function normalizeScenarioCase(scenarioCase: ImportedScenarioCase): ScenarioCase {
  return {
    description: scenarioCase.description,
    expected: scenarioCase.expected,
    input: scenarioCase.input,
    shape: requireScenarioShape(scenarioCase.shape),
    name: scenarioCase.name
  };
}

function isScenarioShape(shape: string): shape is ScenarioShape {
  return Object.hasOwn(scenarioRunnerMap, shape);
}

function requireScenarioShape(shape: string): ScenarioShape {
  if (isScenarioShape(shape)) {
    return shape;
  }

  throw new Error(`Unhandled json core scenario shape: ${shape}`);
}

function readJson(scenarioCase: ScenarioCase): JsonObject {
  return scenarioCase.input.json;
}

function isJsonObject<T>(value: T): value is T & JsonObject {
  return DataType.isRecord(value);
}

function requireJsonObject<T>(value: T, context: string): JsonObject {
  if (isJsonObject(value)) {
    return value;
  }

  throw new TypeError(`Expected object for ${context}`);
}

function cloneJsonObject<T>(value: T, context: string): JsonObject {
  return structuredClone(requireJsonObject(value, context));
}

function requireArray<T>(value: T, context: string): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  throw new TypeError(`Expected array for ${context}`);
}

function requireString<T>(value: T, context: string): string {
  if (typeof value === 'string') {
    return value;
  }

  throw new TypeError(`Expected string for ${context}`);
}

function requiredValue(record: JsonObject, key: string): unknown {
  if (Reflect.has(record, key)) {
    return Reflect.get(record, key);
  }

  throw new TypeError(`Missing scenario value: ${key}`);
}

function requireMap<T>(value: T, context: string): Map<unknown, unknown> {
  if (value instanceof Map) {
    return value;
  }

  throw new TypeError(`Expected Map for ${context}`);
}

function requireSet<T>(value: T, context: string): Set<unknown> {
  if (value instanceof Set) {
    return value;
  }

  throw new TypeError(`Expected Set for ${context}`);
}

function requireDate<T>(value: T, context: string): Date {
  if (value instanceof Date) {
    return value;
  }

  throw new TypeError(`Expected Date for ${context}`);
}

function toMapEntry(pair: unknown[]): [unknown, unknown] {
  return [pair[0], pair[1]];
}

function materializeMap<T>(value: T): Map<unknown, unknown> {
  const descriptor = requireJsonObject(value, 'map descriptor');
  const entries = requireArray(descriptor.entries, 'map descriptor entries');
  const materializedEntries: Array<[unknown, unknown]> = [];
  for (const entry of entries) {
    const pair = requireArray(entry, 'map descriptor entry');
    materializedEntries.push(toMapEntry(pair));
  }

  return new Map(materializedEntries);
}

function materializeSet<T>(value: T): Set<unknown> {
  const descriptor = requireJsonObject(value, 'set descriptor');
  return new Set(requireArray(descriptor.values, 'set descriptor values').map((item) => structuredClone(item)));
}

function materializeCycle<T>(value: T): JsonObject {
  const result = cloneJsonObject(value, 'cycle descriptor');
  for (const [key, child] of Object.entries(result)) {
    if (child === 'cycle') {
      Reflect.set(result, key, result);
    }
  }

  return result;
}

function isRuntimeValueShape(shape: string): shape is keyof typeof runtimeValueByShape {
  return Object.hasOwn(runtimeValueByShape, shape);
}

function materializeRuntimeValue(shape: string): unknown {
  if (isRuntimeValueShape(shape)) {
    return runtimeValueByShape[shape]();
  }

  throw new TypeError(`Unknown runtime value shape: ${shape}`);
}


async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  await scenarioRunnerMap[scenarioCase.shape](scenarioCase);
}

void describe('JSON core', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});

void describe('Clone.deep runtime containers', () => {
  void it('clones a Map and deeply isolates its values', () => {
    const original = new Map([['settings', { 'enabled': true }]]);
    const cloned = Clone.deep(original);
    const originalSettings = original.get('settings');
    const clonedSettings = cloned.get('settings');

    if (originalSettings === undefined || clonedSettings === undefined) {
      throw new Error('Expected Map settings value');
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
      throw new Error('Expected cloned Set member');
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
      throw new Error('Expected nested clone items');
    }
    const originalAppointment = originalItem.calendar.get('next');
    const clonedAppointment = clonedItem.calendar.get('next');
    const clonedMember = clonedItem.members.values().next().value;

    if (originalAppointment === undefined || clonedAppointment === undefined || clonedMember === undefined) {
      throw new Error('Expected nested clone values');
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
    interface TypedValue {
      readonly 'id': string;
      readonly 'state': { readonly 'enabled': boolean };
    }

    const original: TypedValue = { 'id': 'value-1', 'state': { 'enabled': true } };
    const cloned: TypedValue = Clone.deep(original);
    const untrustedInput: unknown = { 'id': 'untrusted-1' };
    const untrustedClone: unknown = Clone.deep(untrustedInput);

    assert.equal(cloned.id, original.id);
    assert.notStrictEqual(cloned.state, original.state);
    assert.deepEqual(untrustedClone, untrustedInput);
  });
});

void describe('restored value-utility runtime contracts', () => {
  void it('compares NaN, Date, RegExp, Map, and Set values structurally', () => {
    const untrusted: unknown = Number.NaN;
    assert.equal(DataType.deepEqual(untrusted, untrusted), true);
    assert.equal(DataType.deepEqual(Number.NaN, Number.NaN), true);
    assert.equal(DataType.deepEqual(new Date(1), new Date(1)), true);
    assert.equal(DataType.deepEqual(new Date(1), new Date(2)), false);
    assert.equal(DataType.deepEqual(new Date(1), {}), false);
    assert.equal(DataType.deepEqual(/value/giu, /value/giu), true);
    assert.equal(DataType.deepEqual(/value/gu, /other/gu), false);
    assert.equal(DataType.deepEqual(/value/gu, {}), false);
    assert.equal(DataType.deepEqual(new Set(['a', 'b']), new Set(['b', 'a'])), true);
    assert.equal(DataType.deepEqual(new Set(['a']), new Set(['b'])), false);
    assert.equal(DataType.deepEqual(new Map([['item', { 'count': 1 }]]), new Map([['item', { 'count': 1 }]])), true);
    assert.equal(DataType.deepEqual(new Map([['item', 1]]), new Map([['item', 2]])), false);
  });

  void it('hashes Date, Map, and Set values deterministically', () => {
    assert.equal(Hash.value(new Date(1)), Hash.value(new Date(1)));
    assert.equal(Hash.value(new Map([['a', 1], ['b', 2]])), Hash.value(new Map([['b', 2], ['a', 1]])));
    assert.equal(Hash.value(new Set(['a', 'b'])), Hash.value(new Set(['b', 'a'])));
    assert.notEqual(Hash.value(new Date(1)), Hash.value({}));
  });

  void it('keeps non-plain merge overlays atomic', () => {
    const date = new Date(1);
    assert.strictEqual(Merge.deep({ 'value': 1 }, date), date);
  });
});
