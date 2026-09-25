import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Array index boundaries for slicing operations. */
export namespace RangeIndicesEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'end': { 'type': 'integer' },
      'start': { 'type': 'integer' }
    },
    'required': ['end', 'start'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'end': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'start': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, ['end', 'start'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
