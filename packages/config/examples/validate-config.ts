/** validate-config — parse an external configuration blob into a typed entity. Run: npx tsx packages/config/examples/validate-config.ts */

import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';
import assert from 'node:assert/strict';

// #region usage
namespace ServerConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'debug': { 'default': false, 'type': 'boolean' },
      'host': { 'minLength': 1, 'type': 'string' },
      'maximumRetries': { 'default': 3, 'minimum': 0, 'type': 'integer' },
      'port': { 'default': 8080, 'maximum': 65_535, 'minimum': 1, 'type': 'integer' }
    },
    'required': ['host'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}

const config = ServerConfigEntity.intake({ 'host': 'localhost', 'ignored': true, 'port': '8081' });

console.log('Parsed config:', config);

assert.deepEqual(config, {
  'debug': false,
  'host': 'localhost',
  'maximumRetries': 3,
  'port': 8081
});

const localConfig = ServerConfigEntity.create({ 'host': 'test.local' });
assert.deepEqual(localConfig, {
  'debug': false,
  'host': 'test.local',
  'maximumRetries': 3,
  'port': 8080
});
// #endregion usage

console.log('validate-config: all assertions passed');
