import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Reports that the drain loop has exited. */
export namespace BusQueueLoopFinishedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'type': { 'const': 'loopFinished' }
    },
    'required': ['type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'type': SchemaNode.defineConst('loopFinished' as const) }, ['type'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
