import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { LogBodyDataEntity } from './LogBodyDataEntity.js';
import { LogLevelEntity } from './LogLevelEntity.js';

/** Canonical CloudWatch envelope fields surrounding operation metadata. */
export namespace CloudWatchLogSchemaFieldsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'level': LogLevelEntity.Schema,
      'message': LogBodyDataEntity.Schema.properties.message,
      'service': { 'minLength': 1, 'type': 'string' },
      'time': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['level', 'message', 'service', 'time'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'level': LogLevelEntity.Node,
    'message': LogBodyDataEntity.Node.schema.properties.message,
    'service': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'time': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  }, ['level', 'message', 'service', 'time'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
