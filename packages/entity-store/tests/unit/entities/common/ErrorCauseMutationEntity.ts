import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A mutation recorded on a hook error cause. */
export namespace ErrorCauseMutationEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'attempt': {
        'type': 'number'
      },
      'message': {
        'type': 'string'
      }
    },
    'required': ['attempt', 'message'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'attempt': SchemaNode.defineNumber({
      'type': 'number'
    } as const),
    'message': SchemaNode.defineString({
      'type': 'string'
    } as const)
  }, ['attempt', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
