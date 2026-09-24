import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace BusQueueOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'highWaterMark': { 'minimum': 1, 'type': 'integer' }
    },
    'type': 'object'
  } as const;

  /** JSON-serializable options for BusQueue construction. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'highWaterMark': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
