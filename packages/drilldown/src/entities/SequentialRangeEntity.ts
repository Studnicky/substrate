import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Range for strings with sequential numeric components. */
export namespace SequentialRangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximum': { 'type': 'integer' },
      'minimum': { 'type': 'integer' },
      'padding': { 'type': 'integer' },
      'prefix': { 'type': 'string' },
      'suffix': { 'type': 'string' }
    },
    'required': ['maximum', 'minimum', 'padding', 'prefix'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximum': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'minimum': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'padding': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'prefix': SchemaNode.defineString({ 'type': 'string' } as const), 'suffix': SchemaNode.defineString({ 'type': 'string' } as const) }, ['maximum', 'minimum', 'padding', 'prefix'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
