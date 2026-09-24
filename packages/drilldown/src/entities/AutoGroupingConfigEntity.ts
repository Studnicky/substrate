import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Configuration for automatic group boundary calculation. */
export namespace AutoGroupingConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'mode': { 'enum': ['count', 'size'] },
      'target': { 'type': 'number' }
    },
    'required': ['mode', 'target'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'mode': SchemaNode.defineEnum(['count', 'size'] as const), 'target': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['mode', 'target'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
