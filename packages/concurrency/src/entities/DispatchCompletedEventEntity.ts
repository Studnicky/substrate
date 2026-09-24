import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Serializable event published when a bounded dispatch completes. */
export namespace DispatchCompletedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'key': { 'minLength': 1, 'type': 'string' },
      'result': { 'type': 'string' }
    },
    'required': ['key', 'result'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'result': SchemaNode.defineString({ 'type': 'string' } as const) }, ['key', 'result'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
