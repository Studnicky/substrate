import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace BusQueueOptionsEntity {
  const HIGH_WATER_MARK_SCHEMA = { 'minimum': 1, 'type': 'integer' } as const;

  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'highWaterMark': HIGH_WATER_MARK_SCHEMA
    },
    'required': [],
    'type': 'object'
  } as const;

  /** JSON-serializable options for BusQueue construction. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'highWaterMark': SchemaNode.defineNumber(HIGH_WATER_MARK_SCHEMA) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
