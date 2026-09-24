import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical transition event for RetryCallMachine. */
export namespace RetryCallTransitionEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'to': { 'enum': ['aborted', 'attempting', 'exhausted', 'failed', 'succeeded', 'waiting'], 'type': 'string' },
      'type': { 'enum': ['transitionTo'], 'type': 'string' }
    },
    'required': ['to', 'type'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'to': SchemaNode.defineEnum(['aborted', 'attempting', 'exhausted', 'failed', 'succeeded', 'waiting'] as const), 'type': SchemaNode.defineEnum(['transitionTo'] as const) }, ['to', 'type'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
