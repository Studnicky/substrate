import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { TimingStatusEntity } from './TimingStatusEntity.js';

export namespace TimingEventInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'component': { 'minLength': 1, 'type': 'string' },
      'operation': { 'minLength': 1, 'type': 'string' },
      'status': TimingStatusEntity.Schema
    },
    'required': ['component', 'operation'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'component': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'operation': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'status': TimingStatusEntity.Node
    },
    ['component', 'operation'] as const,
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
