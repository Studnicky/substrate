import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A recorded remove hook event. */
export namespace HookRemoveEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': {
        'const': 'remove'
      },
      'id': {
        'type': 'string'
      }
    },
    'required': ['event', 'id'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'event': SchemaNode.defineConst({}, 'remove' as const),
    'id': SchemaNode.defineString({
      'type': 'string'
    } as const)
  }, ['event', 'id'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
