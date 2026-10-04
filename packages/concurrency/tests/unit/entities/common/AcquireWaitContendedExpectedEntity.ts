import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{acquireWaitEvents, contendedEvents}` expected shape shared by `Semaphore.loop.spec.ts` contention cases. */
export namespace AcquireWaitContendedExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'acquireWaitEvents': { 'type': 'number' },
      'contendedEvents': { 'items': { 'type': 'number' }, 'type': 'array' }
    },
    'required': ['acquireWaitEvents', 'contendedEvents'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'acquireWaitEvents': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'contendedEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
  }, ['acquireWaitEvents', 'contendedEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
