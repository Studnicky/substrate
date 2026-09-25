import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Date/time range with UTC epoch millisecond boundaries. */
export namespace DateRangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'after': { 'type': 'integer' },
      'before': { 'type': 'integer' }
    },
    'required': ['after', 'before'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'after': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'before': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['after', 'before'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
