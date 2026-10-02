import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** A mutation applied to a nested user profile and role. */
export namespace NestedMutationEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'profileName': {
        'type': 'string'
      },
      'role': {
        'type': 'string'
      }
    },
    'required': ['profileName', 'role'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'profileName': SchemaNode.defineString({
      'type': 'string'
    } as const),
    'role': SchemaNode.defineString({
      'type': 'string'
    } as const)
  }, ['profileName', 'role'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
