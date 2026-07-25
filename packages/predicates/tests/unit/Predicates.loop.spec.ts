import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '../../src/Predicates.js';

import scenarioGroups from './Predicates.scenarios.json';

type ScenarioCase = {
  description: string;
  expected: { result: unknown };
  input: { predicates: Record<string, unknown> };
  kind: string;
  name: string;
};

type PredicateRunner = (input: Record<string, unknown>, expected: { result: unknown }) => void;

function stringField(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  assert.equal(typeof value, 'string');
  return value;
}

function numberField(input: Record<string, unknown>, key: string): number {
  const value = input[key];
  assert.equal(typeof value, 'number');
  return value;
}

function booleanField(input: Record<string, unknown>, key: string): boolean {
  const value = input[key];
  assert.equal(typeof value, 'boolean');
  return value;
}

function arrayField(input: Record<string, unknown>, key: string): unknown[] {
  const value = input[key];
  assert.ok(Array.isArray(value));
  return value;
}

function recordField(input: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = input[key];
  assert.notEqual(value, null);
  assert.equal(typeof value, 'object');
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function optionalNumberField(input: Record<string, unknown>, key: string): number | undefined {
  const value = input[key];
  if (value === undefined) {
    return undefined;
  }
  assert.equal(typeof value, 'number');
  return value;
}

function expectedResult(expected: { result: unknown }): unknown {
  return expected.result === 'undefined' ? undefined : expected.result;
}

function patternFrom(input: Record<string, unknown>): RegExp {
  const pattern = recordField(input, 'pattern');
  const source = stringField(pattern, 'source');
  const flags = stringField(pattern, 'flags');
  const lastSlash = source.lastIndexOf('/');
  const normalizedSource = source.startsWith('/') && lastSlash > 0
    ? source.slice(1, lastSlash)
    : source;

  return new RegExp(normalizedSource, flags);
}

const predicateRunners: Record<string, PredicateRunner> = {
  checkMaximum: (input, expected) => {
    assert.equal(
      Predicates.checkMaximum(numberField(input, 'value'), numberField(input, 'maximum'), booleanField(input, 'exclusive')),
      expected.result
    );
  },
  checkMinimum: (input, expected) => {
    assert.equal(
      Predicates.checkMinimum(numberField(input, 'value'), numberField(input, 'minimum'), booleanField(input, 'exclusive')),
      expected.result
    );
  },
  checkMultipleOf: (input, expected) => {
    assert.equal(Predicates.checkMultipleOf(numberField(input, 'value'), numberField(input, 'divisor')), expected.result);
  },
  checkPattern: (input, expected) => {
    const pattern = patternFrom(input);
    const value = stringField(input, 'value');
    assert.equal(Predicates.checkPattern(value, pattern), expected.result);

    if (recordField(input, 'pattern').checkTwice === true) {
      assert.equal(Predicates.checkPattern(value, pattern), expected.result);
      assert.equal(pattern.lastIndex, 0);
    }
  },
  codePointLength: (input, expected) => {
    assert.equal(Predicates.codePointLength(stringField(input, 'value')), expected.result);
  },
  coerceToBoolean: (input, expected) => {
    assert.equal(Predicates.coerceToBoolean(stringField(input, 'value')), expectedResult(expected));
  },
  coerceToNumber: (input, expected) => {
    assert.equal(Predicates.coerceToNumber(stringField(input, 'value')), expectedResult(expected));
  },
  coerceValue: (input, expected) => {
    assert.equal(Predicates.coerceValue(arrayField(input, 'types') as string[], input.value), expected.result);
  },
  hasAllRequiredProperties: (input, expected) => {
    assert.equal(
      Predicates.hasAllRequiredProperties(recordField(input, 'obj'), arrayField(input, 'required') as string[]),
      expected.result
    );
  },
  hasNoAdditionalProperties: (input, expected) => {
    assert.equal(
      Predicates.hasNoAdditionalProperties(recordField(input, 'obj'), new Set(arrayField(input, 'allowed') as string[])),
      expected.result
    );
  },
  inferValueType: (input, expected) => {
    assert.equal(Predicates.inferValueType(input.value), expected.result);
  },
  matchesAnyType: (input, expected) => {
    assert.equal(Predicates.matchesAnyType(arrayField(input, 'types') as string[], input.value), expected.result);
  },
  matchesType: (input, expected) => {
    assert.equal(Predicates.matchesType(stringField(input, 'schemaType'), input.value), expected.result);
  },
  minMaxProperties: (input, expected) => {
    const runners: Record<string, () => boolean> = {
      max: () => Predicates.satisfiesMaxProperties(recordField(input, 'obj'), numberField(input, 'limit')),
      min: () => Predicates.satisfiesMinProperties(recordField(input, 'obj'), numberField(input, 'limit'))
    };
    const method = stringField(input, 'method');
    const runner = runners[method];
    if (runner === undefined) {
      throw new Error(`Unknown minMaxProperties method: ${method}`);
    }
    assert.equal(runner(), expected.result);
  },
  satisfiesConst: (input, expected) => {
    assert.equal(Predicates.satisfiesConst(input.value, input.constValue), expected.result);
  },
  satisfiesContains: (input, expected) => {
    assert.equal(
      Predicates.satisfiesContains(
        numberField(input, 'matchCount'),
        optionalNumberField(input, 'minContains'),
        optionalNumberField(input, 'maxContains')
      ),
      expected.result
    );
  },
  satisfiesContentEncoding: (input, expected) => {
    assert.equal(
      Predicates.satisfiesContentEncoding(stringField(input, 'value'), stringField(input, 'encoding')),
      expected.result
    );
  },
  satisfiesContentMediaType: (input, expected) => {
    assert.equal(
      Predicates.satisfiesContentMediaType(stringField(input, 'value'), stringField(input, 'mediaType')),
      expected.result
    );
  },
  satisfiesEnum: (input, expected) => {
    assert.equal(Predicates.satisfiesEnum(input.value, arrayField(input, 'enumValues')), expected.result);
  },
  satisfiesMaxItems: (input, expected) => {
    assert.equal(Predicates.satisfiesMaxItems(arrayField(input, 'items'), numberField(input, 'maximum')), expected.result);
  },
  satisfiesMaxLength: (input, expected) => {
    assert.equal(Predicates.satisfiesMaxLength(stringField(input, 'value'), numberField(input, 'maxLength')), expected.result);
  },
  satisfiesMinItems: (input, expected) => {
    assert.equal(Predicates.satisfiesMinItems(arrayField(input, 'items'), numberField(input, 'minimum')), expected.result);
  },
  satisfiesMinLength: (input, expected) => {
    assert.equal(Predicates.satisfiesMinLength(stringField(input, 'value'), numberField(input, 'minLength')), expected.result);
  },
  satisfiesUniqueItems: (input, expected) => {
    assert.equal(Predicates.satisfiesUniqueItems(arrayField(input, 'items')), expected.result);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const operation = scenarioCase.kind.split(':')[0];
  const runner = predicateRunners[operation];
  if (runner === undefined) {
    throw new Error(`Unknown Predicates scenario kind: ${scenarioCase.kind}`);
  }

  runner(scenarioCase.input.predicates, scenarioCase.expected);
}

void describe('Predicates', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      runCase(scenario);
    });
  }
});
