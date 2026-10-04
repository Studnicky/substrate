import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { BusQueueOptionsEntity } from './BusQueueOptionsEntity.js';

export namespace BusQueueCreateOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'handler': {},
      'highWaterMark': BusQueueOptionsEntity.Schema.properties.highWaterMark,
      'onError': {},
      'signal': {}
    },
    'required': ['handler'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'handler': SchemaNode.defineUnknown({} as const),
      'highWaterMark': BusQueueOptionsEntity.Node.schema.properties.highWaterMark,
      'onError': SchemaNode.defineUnknown({} as const),
      'signal': SchemaNode.defineUnknown({} as const)
    },
    ['handler'] as const,
    { 'additionalProperties': false, 'patternProperties': {} }
  );
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
