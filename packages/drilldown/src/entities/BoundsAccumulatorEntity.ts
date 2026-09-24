import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Running minimum/maximum accumulator while scanning a property's values for bounds. */
export namespace BoundsAccumulatorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'dateMaximum': { 'type': ['number', 'null'] },
      'dateMinimum': { 'type': ['number', 'null'] },
      'numberMaximum': { 'type': ['number', 'null'] },
      'numberMinimum': { 'type': ['number', 'null'] }
    },
    'required': ['dateMaximum', 'dateMinimum', 'numberMaximum', 'numberMinimum'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'dateMaximum': SchemaNode.defineAnyOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)]), 'dateMinimum': SchemaNode.defineAnyOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)]), 'numberMaximum': SchemaNode.defineAnyOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)]), 'numberMinimum': SchemaNode.defineAnyOf([SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineNull({ 'type': 'null' } as const)]) }, ['dateMaximum', 'dateMinimum', 'numberMaximum', 'numberMinimum'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
