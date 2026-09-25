import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace ChannelOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'highWaterMark': { 'exclusiveMinimum': 0, 'type': 'integer' }
    },
    'type': 'object'
  } as const;

  /** Construction options for {@link Channel}. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'highWaterMark': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'integer' } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
