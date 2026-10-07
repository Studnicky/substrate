import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace SampleBufferStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isFull': { 'type': 'boolean' },
      'length': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['isFull', 'length'],
    'type': 'object'
  } as const;

  /** Observable state exposed by a sample buffer. */
  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'isFull': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
      'length': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const)
    },
    ['isFull', 'length'] as const,
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
