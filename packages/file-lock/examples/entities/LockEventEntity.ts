import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

export namespace LockEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'extra': { 'type': 'string' },
      'hook': { 'type': 'string' },
      'path': { 'type': 'string' }
    },
    'required': ['hook', 'path'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'extra': SchemaNode.defineString({ 'type': 'string' } as const), 'hook': SchemaNode.defineString({ 'type': 'string' } as const), 'path': SchemaNode.defineString({ 'type': 'string' } as const) }, ['hook', 'path'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
