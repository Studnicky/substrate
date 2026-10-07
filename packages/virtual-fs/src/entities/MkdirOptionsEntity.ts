import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace MkdirOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'recursive': { 'type': 'boolean' }
    },
    'type': 'object'
  } as const;

  /** Options controlling directory creation. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'recursive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
