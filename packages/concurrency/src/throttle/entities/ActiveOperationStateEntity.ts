import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace ActiveOperationStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'completed': { 'type': 'boolean' }
    },
    'required': ['completed'],
    'type': 'object'
  } as const;

  /** Completion state retained for an active operation. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'completed': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['completed'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
