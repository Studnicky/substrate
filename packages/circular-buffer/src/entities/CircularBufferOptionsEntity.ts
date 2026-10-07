import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace CircularBufferOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'capacity': { 'minimum': 1, 'type': 'integer' },
      'overflow': { 'enum': ['overwrite', 'grow'], 'type': 'string' }
    },
    'required': [],
    'type': 'object'
  } as const;

  /** Construction options for {@link CircularBuffer}. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'capacity': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'overflow': SchemaNode.defineEnum({ 'type': 'string' } as const, ['overwrite', 'grow'] as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
