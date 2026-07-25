import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Guard } from '@studnicky/types';

import scenarioGroups from './guard.scenarios.json';

function fixtureFunction(): void {
  return undefined;
}

function namedFixtureFunction(): void {
  return undefined;
}

const specialValueMaterializers = {
  'function': (): (() => void) => fixtureFunction,
  'namedFunction': (): (() => void) => namedFixtureFunction,
  'nan': (): number => NaN,
  'null': (): null => null,
  'undefined': (): undefined => undefined
};

type SpecialValueKind = keyof typeof specialValueMaterializers;

type SerializedScenarioValue =
  | null
  | number
  | boolean
  | string
  | readonly SerializedScenarioValue[]
  | { readonly [key: string]: SerializedScenarioValue }
  | { readonly kind: SpecialValueKind };

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
    assert.strictEqual(Guard.asNumber(input), expected);
  },
  'asRecordArray': (input, expected): void => {
    assert.deepStrictEqual(Guard.asRecordArray(input), expected);
  },
  'asStringOrNull': (input, expected): void => {
    assert.strictEqual(Guard.asStringOrNull(input), expected);
  },
  'isBoolean': (input, expected): void => {
    assert.strictEqual(Guard.isBoolean(input), expected);
  },
  'isFunction': (input, expected): void => {
    assert.strictEqual(Guard.isFunction(input), expected);
  },
  'isNonNegativeInteger': (input, expected): void => {
    assert.strictEqual(Guard.isNonNegativeInteger(input), expected);
  },
  'isNumber': (input, expected): void => {
    assert.strictEqual(Guard.isNumber(input), expected);
  },
  'isObject': (input, expected): void => {
    assert.strictEqual(Guard.isObject(input), expected);
  },
  'isPositiveInteger': (input, expected): void => {
    assert.strictEqual(Guard.isPositiveInteger(input), expected);
  },
  'isString': (input, expected): void => {
    assert.strictEqual(Guard.isString(input), expected);
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

const typedScenarioGroups: Record<GuardGroupName, readonly GuardScenario[]> = scenarioGroups;

function isSpecialValue(
  value: { readonly [key: string]: SerializedScenarioValue }
): value is { readonly kind: SpecialValueKind } {
  return typeof value.kind === 'string' && Object.hasOwn(specialValueMaterializers, value.kind);
}

function materialize(value: SerializedScenarioValue): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => materialize(entry));
  }
  if (isSpecialValue(value)) {
    return specialValueMaterializers[value.kind]();
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, materialize(entry)]));
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
