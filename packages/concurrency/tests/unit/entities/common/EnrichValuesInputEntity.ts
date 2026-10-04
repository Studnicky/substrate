import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{values: {id}[]}` input shape shared by `AsyncIter.loop.spec.ts` enrich cases. */
export namespace EnrichValuesInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'values': {
        'items': {
          'additionalProperties': false,
          'properties': { 'id': { 'type': 'number' } },
          'required': ['id'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': ['values'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineObject({ 'type': 'object' } as const, { 'id': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['id'] as const, { 'additionalProperties': false, 'patternProperties': {} }), undefined)
  }, ['values'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
