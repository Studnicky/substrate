/**
 * Schema-validated options entity for `RealTimeClockProvider`.
 *
 * @module
 */
import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace RealTimeClockProviderOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'offsetMs': { 'default': 0, 'type': 'number' }
    },
    'type': 'object'
  } as const;

  /** Construction options for {@link RealTimeClockProvider}. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'offsetMs': SchemaNode.defineNumber({ 'default': 0, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
