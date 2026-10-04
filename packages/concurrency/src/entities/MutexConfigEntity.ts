import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace MutexConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximumQueueSize': { 'default': 0, 'minimum': 0, 'type': 'integer' },
      'timeout': { 'default': 0, 'minimum': 0, 'type': 'integer' }
    },
    'propertyNames': {
      'enum': ['maximumQueueSize', 'timeout']
    },
    'type': 'object'
  } as const;

  /** Mutex configuration options. Every property carries a default, so none is required. */
  export const Node = SchemaNode.defineObject(
    {
      'propertyNames': {
        'enum': ['maximumQueueSize', 'timeout']
      },
      'type': 'object'
    } as const,
    {
      'maximumQueueSize': SchemaNode.defineNumber({
        'default': 0,
        'minimum': 0,
        'type': 'integer'
      } as const),
      'timeout': SchemaNode.defineNumber({ 'default': 0, 'minimum': 0, 'type': 'integer' } as const)
    },
    [] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> =
    EntityCompiler.compileCreate<Type, InputType>(Schema);
}
