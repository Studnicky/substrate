import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical JSON fields of a circuit-breaker call-failure event. */
export namespace CircuitBreakerCallFailedEventEntity {
  export const Schema = {
    'properties': {
      'at': { 'type': 'number' },
      'type': { 'const': 'callFailed', 'type': 'string' }
    },
    'required': ['at', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'at': SchemaNode.defineNumber({ 'type': 'number' } as const), 'type': SchemaNode.defineConst('callFailed' as const) }, ['at', 'type'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
