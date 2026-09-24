import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** `CircuitBreakerMachine` event: caller invoked `forceOpen()`, carrying the clock reading to record as `openedAt`. */
export namespace CircuitBreakerManualOpenEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'at': { 'type': 'number' },
      'type': { 'const': 'manualOpen', 'type': 'string' }
    },
    'required': ['at', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'at': SchemaNode.defineNumber({ 'type': 'number' } as const), 'type': SchemaNode.defineConst('manualOpen' as const) }, ['at', 'type'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
