import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Contiguous range of numeric values with inclusive minimum and exclusive maximum bounds. */
export namespace RangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximum': { 'type': 'number' },
      'minimum': { 'type': 'number' }
    },
    'required': ['maximum', 'minimum'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximum': SchemaNode.defineNumber({ 'type': 'number' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['maximum', 'minimum'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
