import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Declarative string-based time range boundaries for filter configuration. */
export namespace TimeRangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'inclusive': { 'type': 'boolean' },
      'maximum': { 'type': 'string' },
      'minimum': { 'type': 'string' }
    },
    'required': ['maximum', 'minimum'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'inclusive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'maximum': SchemaNode.defineString({ 'type': 'string' } as const), 'minimum': SchemaNode.defineString({ 'type': 'string' } as const) }, ['maximum', 'minimum'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
