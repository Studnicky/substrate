/** validate-config — parse an external configuration blob into a typed entity. Run: npx tsx packages/config/examples/validate-config.ts */

import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';
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
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'debug': SchemaNode.defineBoolean({ 'default': false, 'type': 'boolean' } as const), 'host': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'maximumRetries': SchemaNode.defineNumber({ 'default': 3, 'minimum': 0, 'type': 'integer' } as const), 'port': SchemaNode.defineNumber({ 'default': 8080, 'maximum': 65_535, 'minimum': 1, 'type': 'integer' } as const) }, ['host'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}

const config = ServerConfigEntity.intake({ 'host': 'localhost', 'port': 8081 });

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
