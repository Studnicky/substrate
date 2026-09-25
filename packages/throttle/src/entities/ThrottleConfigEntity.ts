import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { AdaptiveConfigEntity } from './AdaptiveConfigEntity.js';

export namespace ThrottleConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adaptive': {
        ...AdaptiveConfigEntity.Schema,
        'description': 'Adaptive concurrency configuration.'
      },
      'concurrencyLimit': {
        'description': 'Maximum number of concurrent operations.',
        'minimum': 1,
        'type': 'integer'
      }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'adaptive': AdaptiveConfigEntity.Node,
      'concurrencyLimit': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const)
    },
    [] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
