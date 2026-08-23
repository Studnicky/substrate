import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import {
  SchemaIntakeError,
  SchemaValidator
} from '../../../src/index.js';
import scenarioGroups from './SchemaValidatorIntake.scenarios.json' with { type: 'json' };

type JsonObject = Record<string, unknown>;
type ScenarioCase = (typeof scenarioGroups.cases)[number];
type ScenarioShape =
  | 'assert-isolated'
  | 'create-defaults'
  | 'create-no-coercion'
  | 'cyclic-input'
  | 'intake-rejection'
  | 'intake-transforms'
  | 'separate-registries';
type ScenarioRunner = (scenarioCase: ScenarioCase) => void;

const scenarioRunnerMap = {
  'intake-transforms': (scenarioCase) => {
    const input = requireObject(scenarioCase.input, 'intake transforms input');
    const expected = requireObject(scenarioCase.expected, 'intake transforms expected');
    const original = requireObject(requiredValue(expected, 'original'), 'intake transforms original');
    const result = SchemaValidator.compileIntake<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/schema-intake-transforms',
      'additionalProperties': false,
      'properties': {
        'host': { 'default': 'localhost', 'type': 'string' },
        'port': { 'type': 'integer' }
      },
      'required': ['port'],
      'type': 'object'
    })(input);

    assert.deepEqual(result, requiredValue(expected, 'result'));
    assert.equal(JSON.stringify(input), JSON.stringify(original));
  },

  'intake-rejection': (scenarioCase) => {
    const input = requireObject(scenarioCase.input, 'intake rejection input');
    const expected = requireObject(scenarioCase.expected, 'intake rejection expected');
    const intake = SchemaValidator.compileIntake<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/schema-intake-rejection',
      'additionalProperties': false,
      'properties': { 'port': { 'type': 'integer' } },
      'required': ['port'],
      'type': 'object'
    });

    try {
      intake(input);
      assert.fail('Expected intake to reject an invalid port');
    } catch (error) {
      if (!(error instanceof SchemaIntakeError)) {
        throw error;
      }

      assert.match(error.message, new RegExp(requireString(requiredValue(expected, 'path'), 'intake rejection path'), 'u'));
      assert.ok(error.errors.length > 0);
      assert.equal(error.schemaIdentifier, requireString(requiredValue(expected, 'schemaIdentifier'), 'intake rejection schema identifier'));
    }
  },

  'create-defaults': (scenarioCase) => {
    const expected = requireObject(scenarioCase.expected, 'create defaults expected');
    const create = SchemaValidator.compileCreate<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/schema-create-defaults',
      'additionalProperties': false,
      'properties': {
        'host': { 'default': 'localhost', 'type': 'string' },
        'port': { 'default': 3000, 'type': 'integer' }
      },
      'type': 'object'
    });

    assert.deepEqual(create(), requiredValue(expected, 'allDefaults'));
    assert.deepEqual(create(requireObject(scenarioCase.input, 'create defaults input')), requiredValue(expected, 'partialDefaults'));
  },

  'create-no-coercion': (scenarioCase) => {
    const input = requireObject(scenarioCase.input, 'create no coercion input');
    const expected = requireObject(scenarioCase.expected, 'create no coercion expected');
    const create = SchemaValidator.compileCreate<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/schema-create-no-coercion',
      'additionalProperties': false,
      'properties': { 'port': { 'type': 'integer' } },
      'required': ['port'],
      'type': 'object'
    });

    try {
      create(input);
      assert.fail('Expected create to reject a string port');
    } catch (error) {
      if (!(error instanceof SchemaIntakeError)) {
        throw error;
      }

      assert.match(error.message, new RegExp(requireString(requiredValue(expected, 'path'), 'create no coercion path'), 'u'));
    }
  },

  'assert-isolated': (scenarioCase) => {
    const input = requireObject(scenarioCase.input, 'assert isolated input');
    const expected = requireObject(scenarioCase.expected, 'assert isolated expected');
    const validate = SchemaValidator.compile<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/schema-assert-isolated',
      'additionalProperties': false,
      'properties': {
        'host': { 'default': 'localhost', 'type': 'string' },
        'port': { 'type': 'integer' }
      },
      'type': 'object'
    });

    assert.equal(validate(input), false);
    assert.deepEqual(input, requiredValue(expected, 'original'));
    const missingDefault: Record<string, unknown> = { 'port': 8080 };
    assert.equal(validate(missingDefault), true);
    assert.deepEqual(missingDefault, requiredValue(expected, 'withoutDefault'));
  },

  'separate-registries': () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/schema-separate-registries',
      'additionalProperties': false,
      'properties': { 'host': { 'default': 'localhost', 'type': 'string' } },
      'type': 'object'
    };
    const validate = SchemaValidator.compile<Record<string, unknown>>(schema);
    const intake = SchemaValidator.compileIntake<Record<string, unknown>>(schema);
    const create = SchemaValidator.compileCreate<Record<string, unknown>>(schema);

    assert.equal(SchemaValidator.compile<Record<string, unknown>>(schema), validate);
    assert.equal(validate({}), true);
    assert.deepEqual(intake({}), { 'host': 'localhost' });
    assert.deepEqual(create(), { 'host': 'localhost' });
    assert.deepEqual(SchemaValidator.compileIntake<Record<string, unknown>>(schema)({}), { 'host': 'localhost' });
    assert.deepEqual(SchemaValidator.compileCreate<Record<string, unknown>>(schema)(), { 'host': 'localhost' });
  },

  'cyclic-input': (scenarioCase) => {
    const expected = requireObject(scenarioCase.expected, 'cyclic input expected');
    const input: Record<string, unknown> = {};
    input.self = input;
    const intake = SchemaValidator.compileIntake<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/schema-cyclic-input',
      'additionalProperties': false,
      'type': 'object'
    });

    try {
      intake(input);
      assert.fail('Expected intake to reject cyclic input before cloning');
    } catch (error) {
      if (!(error instanceof SchemaIntakeError)) {
        throw error;
      }

      assert.match(error.message, new RegExp(requireString(requiredValue(expected, 'message'), 'cyclic input message'), 'iu'));
    }
  }
} satisfies Record<ScenarioShape, ScenarioRunner>;

function isScenarioShape(value: string): value is ScenarioShape {
  return Object.hasOwn(scenarioRunnerMap, value);
}

function requireObject(value: unknown, context: string): JsonObject {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const result: JsonObject = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = item;
    }

    return result;
  }

  throw new TypeError(`Expected object for ${context}`);
}

function requireString(value: unknown, context: string): string {
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

void describe('SchemaValidator intake and create', () => {
  for (const scenarioCase of scenarioGroups.cases) {
    void it(scenarioCase.name, () => {
      if (!isScenarioShape(scenarioCase.shape)) {
        throw new Error(`Unhandled schema intake scenario shape: ${scenarioCase.shape}`);
      }

      scenarioRunnerMap[scenarioCase.shape](scenarioCase);
    });
  }
});
