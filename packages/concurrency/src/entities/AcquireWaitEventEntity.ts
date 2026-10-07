import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace AcquireWaitEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'key': { 'type': 'string' },
      'waitTimeMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['key', 'waitTimeMs'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'key': SchemaNode.defineString({ 'type': 'string' } as const),
      'waitTimeMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const)
    },
    ['key', 'waitTimeMs'] as const,
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
