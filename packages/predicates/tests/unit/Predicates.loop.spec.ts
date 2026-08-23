import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Predicates } from '../../src/Predicates.js';

import scenarioGroups from './Predicates.scenarios.json' with { type: 'json' };

type ScenarioCase = {
  description: string;
  expected: { result: unknown; lastIndex?: number };
  input: { predicates: Record<string, unknown> };
  shape: string;
  name: string;
};

type PredicateRunner = (input: Record<string, unknown>, expected: ScenarioCase['expected']) => void;
type PatternFactory = () => RegExp;

const patternFactories: Record<string, PatternFactory> = {
  '/^he/u|u': () => /^he/u,
  '^he|gu': () => /^he/gu
};

function stringField(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== 'string') {
    throw new Error(`Expected string field '${key}'`);
  }
  return value;
}

function numberField(input: Record<string, unknown>, key: string): number {
  const value = input[key];
  if (typeof value !== 'number') {
    throw new Error(`Expected number field '${key}'`);
  }
  return value;
}

function booleanField(input: Record<string, unknown>, key: string): boolean {
  const value = input[key];
  if (typeof value !== 'boolean') {
    throw new Error(`Expected boolean field '${key}'`);
  }
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
  if (typeof value !== 'number') {
    throw new Error(`Expected number field '${key}'`);
  }
  return value;
}

function optionalStringField(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected string field '${key}'`);
  }
  return value;
}

function expectedResult(expected: { result: unknown }): unknown {
  return expected.result === 'undefined' ? undefined : expected.result;
}

function patternFrom(input: Record<string, unknown>): RegExp {
  const pattern = recordField(input, 'pattern');
  const source = stringField(pattern, 'source');
  const flags = stringField(pattern, 'flags');
  const factory = patternFactories[`${source}|${flags}`];

  if (factory === undefined) {
    throw new Error(`Unsupported predicate pattern scenario: ${source}|${flags}`);
  }

  return factory();
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
      assert.equal(pattern.lastIndex, expected.lastIndex);
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
      max: () => Predicates.satisfiesMaximumProperties(recordField(input, 'obj'), numberField(input, 'limit')),
      min: () => Predicates.satisfiesMinimumProperties(recordField(input, 'obj'), numberField(input, 'limit'))
    };
    const method = stringField(input, 'method');
    const runner = runners[method];
    if (runner === undefined) {
      throw new Error(`Unknown minMaxProperties method: ${method}`);
    }
    assert.equal(runner(), expected.result);
  },
  satisfiesContains: (input, expected) => {
    assert.equal(
      Predicates.satisfiesContains(
        numberField(input, 'matchCount'),
        {
          'maximumContains': optionalNumberField(input, 'maxContains'),
          'minimumContains': optionalNumberField(input, 'minContains')
        }
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
      Predicates.satisfiesContentMediaType(
        stringField(input, 'value'),
        stringField(input, 'mediaType'),
        optionalStringField(input, 'encoding')
      ),
      expected.result
    );
  },
  satisfiesEnum: (input, expected) => {
    assert.equal(Predicates.satisfiesEnum(input.value, arrayField(input, 'enumValues')), expected.result);
  },
  satisfiesMaximumItems: (input, expected) => {
    assert.equal(Predicates.satisfiesMaximumItems(arrayField(input, 'items'), numberField(input, 'maximum')), expected.result);
  },
  satisfiesMaximumLength: (input, expected) => {
    assert.equal(Predicates.satisfiesMaximumLength(stringField(input, 'value'), numberField(input, 'maxLength')), expected.result);
  },
  satisfiesMinimumItems: (input, expected) => {
    assert.equal(Predicates.satisfiesMinimumItems(arrayField(input, 'items'), numberField(input, 'minimum')), expected.result);
  },
  satisfiesMinimumLength: (input, expected) => {
    assert.equal(Predicates.satisfiesMinimumLength(stringField(input, 'value'), numberField(input, 'minLength')), expected.result);
  },
  satisfiesUniqueItems: (input, expected) => {
    assert.equal(Predicates.satisfiesUniqueItems(arrayField(input, 'items')), expected.result);
  }
};

function runCase(scenarioCase: ScenarioCase): void {
  const operation = scenarioCase.shape.split(':')[0];
  if (operation === undefined) {
    throw new Error(`Unknown Predicates scenario shape: ${scenarioCase.shape}`);
  }
  const runner = predicateRunners[operation];
  if (runner === undefined) {
    throw new Error(`Unknown Predicates scenario shape: ${scenarioCase.shape}`);
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
