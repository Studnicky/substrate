import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{minLength, values}` input shape for the `AsyncIter.loop.spec.ts` async-filter case. */
export namespace FilterAsyncInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'minLength': { 'type': 'number' },
      'values': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['minLength', 'values'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'minLength': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'values': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)
  }, ['minLength', 'values'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
