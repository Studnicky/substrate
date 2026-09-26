import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace AbortResultEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cancelled': { 'minimum': 0, 'type': 'integer' },
      'completed': { 'minimum': 0, 'type': 'integer' },
      'timedOut': { 'type': 'boolean' }
    },
    'required': ['cancelled', 'completed', 'timedOut'],
    'type': 'object'
  } as const;

  /**
   * Result of an abort operation on a throttle or similar async primitive.
   *
   * Contains statistics about what happened during the abort:
   * - How many operations were cancelled
   * - How many completed before the abort
   * - Whether the grace period timed out
   */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cancelled': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'completed': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'timedOut': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['cancelled', 'completed', 'timedOut'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
