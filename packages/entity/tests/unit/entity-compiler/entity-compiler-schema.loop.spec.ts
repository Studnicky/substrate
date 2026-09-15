import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityCompiler } from '../../../src/EntityCompiler.js';
import { SchemaIntakeError } from '../../../src/SchemaIntakeError.js';

void describe('EntityCompiler schema boundaries', () => {
  void it('compiles idempotent pure assertion validators', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-compiler-assert',
      'additionalProperties': false,
      'properties': {
        'host': { 'default': 'localhost', 'type': 'string' },
        'port': { 'type': 'integer' }
      },
      'type': 'object'
    };
    const first = EntityCompiler.compile<Record<string, unknown>>(schema);
    const second = EntityCompiler.compile<Record<string, unknown>>(schema);
    const input = { 'port': 8080 };

    assert.equal(first, second);
    assert.equal(first(input), true);
    assert.deepEqual(input, { 'port': 8080 });
    assert.equal(first({ 'port': '8080' }), false);
    const errors = first.errors;
    assert.ok(errors !== null && errors !== undefined);
    assert.ok(errors.length > 0);
    assert.equal(errors[0]?.keyword, 'type');
    assert.equal(errors[0]?.params.missingProperty, undefined);
    assert.equal(EntityCompiler.formatErrors(null), 'invalid payload');
  });

  void it('exposes normalized diagnostic parameters', () => {
    const validate = EntityCompiler.compile<{ port: number }>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-diagnostic-parameters',
      'properties': { 'port': { 'type': 'integer' } },
      'required': ['port'],
      'type': 'object'
    });

    assert.equal(validate({}), false);
    const errors = validate.errors;
    assert.ok(errors !== null && errors !== undefined);
    assert.equal(errors[0]?.keyword, 'required');
    assert.equal(errors[0]?.params.missingProperty, 'port');
  });

  void it('fills defaults on an intake clone without coercing values', () => {
    const intake = EntityCompiler.compileIntake<{ host: string; port: number }>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-intake',
      'additionalProperties': false,
      'properties': {
        'host': { 'default': 'localhost', 'type': 'string' },
        'port': { 'type': 'integer' }
      },
      'required': ['port'],
      'type': 'object'
    });
    const input = { 'port': 8080 };

    assert.deepEqual(intake(input), { 'host': 'localhost', 'port': 8080 });
    assert.deepEqual(input, { 'port': 8080 });
    assert.throws(() => intake({ 'port': '8080' }), SchemaIntakeError);
  });

  void it('fills defaults during object creation', () => {
    const create = EntityCompiler.compileCreate<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-create',
      'additionalProperties': false,
      'properties': {
        'host': { 'default': 'localhost', 'type': 'string' },
        'port': { 'default': 3000, 'type': 'integer' }
      },
      'type': 'object'
    });

    assert.deepEqual(create(), { 'host': 'localhost', 'port': 3000 });
    assert.throws(() => create({ 'port': '3000' }), SchemaIntakeError);
  });

  void it('keeps assertion, intake, and creation registries isolated', () => {
    const schema = {
      '$id': 'https://studnicky.dev/schemas/entity-compiler-registries',
      'additionalProperties': false,
      'properties': { 'host': { 'default': 'localhost', 'type': 'string' } },
      'type': 'object'
    };
    const assertSchema = EntityCompiler.compile<Record<string, unknown>>(schema);
    const intake = EntityCompiler.compileIntake<Record<string, unknown>>(schema);
    const create = EntityCompiler.compileCreate<Record<string, unknown>>(schema);

    assert.equal(assertSchema({}), true);
    assert.deepEqual(intake({}), { 'host': 'localhost' });
    assert.deepEqual(create(), { 'host': 'localhost' });
  });

  void it('uses schemas to enforce additional properties without mutating inputs', () => {
    const strictIntake = EntityCompiler.compileIntake<{ port: number }>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-additional-properties',
      'additionalProperties': false,
      'properties': { 'port': { 'type': 'integer' } },
      'required': ['port'],
      'type': 'object'
    });
    const input = { 'port': 8080, 'unexpected': 'preserved' };

    assert.throws(() => strictIntake(input), SchemaIntakeError);
    assert.deepEqual(input, { 'port': 8080, 'unexpected': 'preserved' });
  });

  void it('accepts and rejects schema-valued additional properties without mutating input', () => {
    const intake = EntityCompiler.compileIntake<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-schema-additional-properties',
      'additionalProperties': { 'type': 'string' },
      'properties': { 'port': { 'type': 'integer' } },
      'required': ['port'],
      'type': 'object'
    });
    const accepted = { 'port': 8080, 'region': 'us-east-1' };

    assert.deepEqual(intake(accepted), accepted);
    assert.deepEqual(accepted, { 'port': 8080, 'region': 'us-east-1' });
    assert.throws(() => intake({ 'port': 8080, 'region': false }), SchemaIntakeError);
  });

  void it('does not let a failing anyOf branch mutate a succeeding branch candidate', () => {
    const intake = EntityCompiler.compileIntake<{ ok: true; result: { id: string } }>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-any-of',
      'anyOf': [
        {
          'additionalProperties': false,
          'properties': { 'error': { 'type': 'string' } },
          'required': ['error'],
          'type': 'object'
        },
        {
          'additionalProperties': false,
          'properties': {
            'ok': { 'const': true },
            'result': {
              'additionalProperties': false,
              'properties': { 'id': { 'type': 'string' } },
              'required': ['id'],
              'type': 'object'
            }
          },
          'required': ['ok', 'result'],
          'type': 'object'
        }
      ],
      'type': 'object'
    });
    const input = { 'ok': true, 'result': { 'id': 'result-1' } };

    assert.deepEqual(intake(input), input);
    assert.deepEqual(input, { 'ok': true, 'result': { 'id': 'result-1' } });
  });
  void it('omits optional undefined properties through nested allOf and local references', () => {
    const intake = EntityCompiler.compileIntake<Record<string, unknown>>({
      '$defs': {
        'baseOptions': {
          'properties': { 'method': { 'type': 'string' } },
          'type': 'object'
        },
        'extendedOptions': {
          'allOf': [
            { '$ref': '#/$defs/baseOptions' },
            {
              'properties': { 'retries': { 'type': 'integer' } },
              'type': 'object'
            }
          ],
          'type': 'object'
        }
      },
      '$id': 'https://studnicky.dev/schemas/entity-compiler-composed-undefined',
      'additionalProperties': false,
      'properties': { 'options': { '$ref': '#/$defs/extendedOptions' } },
      'type': 'object'
    });

    assert.deepEqual(intake({ 'options': { 'method': undefined } }), { 'options': {} });
    assert.throws(() => intake({ 'options': { 'method': undefined, 'retries': 'many' } }), /\/options\/retries: must be integer/u);
  });

  void it('omits undefined properties only when every conditional branch declares them optional', () => {
    const safeIntake = EntityCompiler.compileIntake<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-safe-conditional-undefined',
      'anyOf': [
        { 'properties': { 'option': { 'type': 'string' } }, 'type': 'object' },
        { 'properties': { 'option': { 'maxLength': 10, 'type': 'string' } }, 'type': 'object' }
      ],
      'type': 'object'
    });
    const unsafeIntake = EntityCompiler.compileIntake<Record<string, unknown>>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-unsafe-conditional-undefined',
      'anyOf': [
        { 'properties': { 'option': { 'type': 'string' } }, 'type': 'object' },
        { 'properties': { 'other': { 'type': 'string' } }, 'type': 'object' }
      ],
      'type': 'object'
    });

    assert.deepEqual(safeIntake({ 'option': undefined }), {});
    assert.throws(() => unsafeIntake({ 'option': undefined }), /\/option: undefined is not valid JSON data/u);
  });


  void it('omits declared undefined properties while rejecting undeclared properties and undefined array values', () => {
    const objectIntake = EntityCompiler.compileIntake<{ optional?: string }>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-undefined-object',
      'additionalProperties': false,
      'properties': { 'optional': { 'type': 'string' } },
      'type': 'object'
    });
    const arrayIntake = EntityCompiler.compileIntake<unknown[]>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-undefined-array',
      'type': 'array'
    });

    assert.deepEqual(objectIntake({ 'optional': undefined }), {});
    assert.throws(() => objectIntake({ 'undeclared': undefined }), /\/undeclared: undefined is not valid JSON data/u);
    assert.throws(() => arrayIntake([undefined]), /\/0: undefined is not valid JSON data/u);
  });

  void it('omits undefined values declared by pattern properties while retaining undeclared keys', () => {
    const intake = EntityCompiler.compileIntake<Record<string, string>>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-pattern-properties',
      'additionalProperties': false,
      'patternProperties': { '^setting_': { 'type': 'string' } },
      'type': 'object'
    });

    assert.deepEqual(intake({ 'setting_optional': undefined }), {});
    assert.throws(() => intake({ 'undeclared': undefined }), /\/undeclared: undefined is not valid JSON data/u);
  });

  void it('rejects cyclic and non-JSON intake with stable entity errors', () => {
    const intake = EntityCompiler.compileIntake<Record<string, never>>({
      '$id': 'https://studnicky.dev/schemas/entity-compiler-errors',
      'type': 'object'
    });
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;

    try {
      intake(cyclic);
      assert.fail('Expected cyclic intake to fail');
    } catch (error) {
      if (!(error instanceof SchemaIntakeError)) {
        throw error;
      }
      assert.equal(error.code, 'entity.schemaIntakeFailed');
      assert.equal(error.retryable, false);
      assert.equal(error.schemaIdentifier, 'https://studnicky.dev/schemas/entity-compiler-errors');
      assert.match(error.message, /cyclic input is not supported/u);
    }
    assert.throws(() => intake({ 'nested': { 'value': Number.NaN } }), /\/nested\/value: NaN is not valid JSON data/u);
  });

  void it('rejects Date, Map, and Set values at JSON-only intake boundaries', () => {
    const intake = EntityCompiler.compileIntake<unknown>({});

    assert.throws(() => intake(new Date(0)), SchemaIntakeError);
    assert.throws(() => intake(new Map()), SchemaIntakeError);
    assert.throws(() => intake(new Set()), SchemaIntakeError);
  });
});
