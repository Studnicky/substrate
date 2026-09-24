import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** `CircuitBreakerMachine` state: calls pass through; counts consecutive failures. */
export namespace CircuitBreakerClosedStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'failureCount': { 'minimum': 0, 'type': 'integer' },
      'variant': { 'const': 'closed', 'type': 'string' }
    },
    'required': ['failureCount', 'variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'failureCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'variant': SchemaNode.defineConst('closed' as const) }, ['failureCount', 'variant'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
