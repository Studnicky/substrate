/**
 * Schema-validated options entity for `VirtualTimeCounter`.
 *
 * @module
 */
import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace VirtualTimeCounterOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'startMs': { 'default': 0, 'minimum': 0, 'type': 'number' }
    },
    'type': 'object'
  } as const;

  /** Construction options for {@link VirtualTimeCounter}. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'startMs': SchemaNode.defineNumber({ 'default': 0, 'minimum': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
