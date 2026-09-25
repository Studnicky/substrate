import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace UserCreatedEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'user:created': {
        'additionalProperties': false,
        'properties': {
          'email': { 'type': 'string' },
          'id': { 'type': 'string' }
        },
        'required': ['email', 'id'],
        'type': 'object'
      }
    },
    'required': ['user:created'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'user:created': SchemaNode.defineObject({ 'type': 'object' } as const, { 'email': SchemaNode.defineString({ 'type': 'string' } as const), 'id': SchemaNode.defineString({ 'type': 'string' } as const) }, ['email', 'id'] as const, { 'additionalProperties': false }) }, ['user:created'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
