import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace ContextConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'name': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['name'],
    'type': 'object'
  } as const;

  /** Configuration options for creating a Context instance. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['name'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
