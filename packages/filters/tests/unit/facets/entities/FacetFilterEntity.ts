import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** The selected values per faceted-discovery dimension; an absent dimension is unfiltered. */
export namespace FacetFilterEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'color': { 'items': { 'type': 'string' }, 'type': 'array' },
      'size': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': [],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'color': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineString({ 'type': 'string' } as const),
        undefined
      ),
      'size': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineString({ 'type': 'string' } as const),
        undefined
      )
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
