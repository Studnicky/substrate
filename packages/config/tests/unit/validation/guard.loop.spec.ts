import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '@studnicky/types';

import scenarioGroups from './guard.scenarios.json' with { type: 'json' };

function fixtureFunction(): void {
  return undefined;
}

function namedFixtureFunction(): void {
  return undefined;
}

const specialValueMaterializers = {
  'function': (): (() => void) => fixtureFunction,
  'map': (): Map<unknown, unknown> => new Map(),
  'namedFunction': (): (() => void) => namedFixtureFunction,
  'nan': (): number => NaN,
  'null': (): null => null,
  'set': (): Set<unknown> => new Set(),
  'undefined': (): undefined => undefined
};

type SpecialValueShape = keyof typeof specialValueMaterializers;

type SerializedScenarioValue =
  | null
  | number
  | boolean
  | string
  | readonly SerializedScenarioValue[]
  | { readonly [key: string]: SerializedScenarioValue }
  | { readonly shape: SpecialValueShape };

type GuardScenario = {
  readonly description: string;
  readonly input: SerializedScenarioValue;
  readonly outcome: SerializedScenarioValue;
};

type GuardGroupName =
  | 'asNumber'
  | 'asRecordArray'
  | 'asStringOrNull'
  | 'isBoolean'
  | 'isFunction'
  | 'isNonNegativeInteger'
  | 'isNumber'
  | 'isObject'
  | 'isPositiveInteger'
  | 'isString';

type GuardAssertion = (input: unknown, expected: unknown) => void;

const guardAssertions: Record<GuardGroupName, GuardAssertion> = {
  'asNumber': (input, expected): void => {
    assert.strictEqual(Predicates.asNumber(input), expected);
  },
  'asRecordArray': (input, expected): void => {
    assert.deepStrictEqual(Predicates.asRecordArray(input), expected);
  },
  'asStringOrNull': (input, expected): void => {
    assert.strictEqual(Predicates.asStringOrNull(input), expected);
  },
  'isBoolean': (input, expected): void => {
    assert.strictEqual(Predicates.isBoolean(input), expected);
  },
  'isFunction': (input, expected): void => {
    assert.strictEqual(Predicates.isFunction(input), expected);
  },
  'isNonNegativeInteger': (input, expected): void => {
    assert.strictEqual(Predicates.isNonNegativeInteger(input), expected);
  },
  'isNumber': (input, expected): void => {
    assert.strictEqual(Predicates.isNumber(input), expected);
  },
  'isObject': (input, expected): void => {
    assert.strictEqual(Predicates.isObject(input), expected);
  },
  'isPositiveInteger': (input, expected): void => {
    assert.strictEqual(Predicates.isPositiveInteger(input), expected);
  },
  'isString': (input, expected): void => {
    assert.strictEqual(Predicates.isString(input), expected);
  }
};

const guardGroupNames: readonly GuardGroupName[] = [
  'isObject',
  'isString',
  'isNumber',
  'asNumber',
  'isBoolean',
  'isFunction',
  'asStringOrNull',
  'asRecordArray',
  'isNonNegativeInteger',
  'isPositiveInteger'
];

const typedScenarioGroups = scenarioGroups as Record<GuardGroupName, readonly GuardScenario[]>;

function isSpecialValue(
  value: { readonly [key: string]: SerializedScenarioValue }
): value is { readonly shape: SpecialValueShape } {
  return typeof value.shape === 'string' && Object.hasOwn(specialValueMaterializers, value.shape);
}

function materialize(value: SerializedScenarioValue): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => materialize(entry));
  }
  // Array.isArray() above rules out the array branch at runtime, but TypeScript's
  // narrower can't fold that back into this recursive union — the object shape
  // is asserted, not assumed.
  const objectValue = value as { readonly [key: string]: SerializedScenarioValue };
  if (isSpecialValue(objectValue)) {
    return specialValueMaterializers[objectValue.shape]();
  }
  return Object.fromEntries(Object.entries(objectValue).map(([key, entry]) => [key, materialize(entry)]));
}

for (const groupName of guardGroupNames) {
  void describe(groupName, () => {
    for (const scenario of typedScenarioGroups[groupName]) {
      void it(scenario.description, () => {
        const input = materialize(scenario.input);
        const expected = materialize(scenario.outcome);
        guardAssertions[groupName](input, expected);
      });
    }
  });
}
