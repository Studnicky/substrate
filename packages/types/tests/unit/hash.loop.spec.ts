import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Hash } from '../../src/objects/Hash.js';
import { StructuralHash } from '../../src/objects/StructuralHash.js';
import { Predicates } from '../../src/predicates/Predicates.js';

import scenarioGroups from './hash.scenarios.json' with { type: 'json' };

type ScenarioShape =
  | 'hash-different'
  | 'hash-distinct-shapes'
  | 'hash-edge-values'
  | 'hash-hex'
  | 'hash-identical'
  | 'hash-nested'
  | 'hash-order'
  | 'hash-primitive'
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
type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

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

  throw new TypeError(`Unhandled hash scenario shape: ${shape}`);
}

function readJson(scenarioCase: ScenarioCase): JsonObject {
  return scenarioCase.input.json;
}

function isJsonObject<T>(value: T): value is T & JsonObject {
  return Predicates.isRecord(value);
}

function requireJsonObject<T>(value: T, context: string): JsonObject {
  if (isJsonObject(value)) {
    return value;
  }

  throw new TypeError(`Expected object for ${context}`);
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

function isRuntimeValueShape(shape: string): shape is keyof typeof runtimeValueByShape {
  return Object.hasOwn(runtimeValueByShape, shape);
}

function materializeRuntimeValue(shape: string): unknown {
  if (isRuntimeValueShape(shape)) {
    return runtimeValueByShape[shape]();
  }

  throw new TypeError(`Unknown runtime value shape: ${shape}`);
}

function runCase(scenarioCase: ScenarioCase): void {
  scenarioRunnerMap[scenarioCase.shape](scenarioCase);
}

void describe('Hash and StructuralHash', () => {
  for (const scenarioCase of scenarioCases) {
    void it(scenarioCase.name, () => {
      runCase(scenarioCase);
    });
  }

  void it('hashes Date, Map, and Set values deterministically', () => {
    assert.equal(Hash.value(new Date(1)), Hash.value(new Date(1)));
    assert.equal(Hash.value(new Map([['a', 1], ['b', 2]])), Hash.value(new Map([['b', 2], ['a', 1]])));
    assert.equal(Hash.value(new Set(['a', 'b'])), Hash.value(new Set(['b', 'a'])));
    assert.notEqual(Hash.value(new Date(1)), Hash.value({}));
  });
});
