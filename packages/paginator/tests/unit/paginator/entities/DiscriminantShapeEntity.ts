import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace DiscriminantShapeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'shape': { 'enum': ['cursor-discriminants', 'event-discriminants', 'state-discriminants'], 'type': 'string' }
    },
    'required': ['shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineEnum({ 'type': 'string' } as const, ['cursor-discriminants', 'event-discriminants', 'state-discriminants'] as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
