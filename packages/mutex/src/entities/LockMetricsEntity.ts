import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace LockMetricsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'acquiredAt': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['acquiredAt'],
    'type': 'object'
  } as const;

  /** Metrics recorded when a lock is acquired. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'acquiredAt': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['acquiredAt'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
