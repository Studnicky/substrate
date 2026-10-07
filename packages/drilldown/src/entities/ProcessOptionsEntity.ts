import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** Top-level configuration for the drilldown processing pipeline. */
export namespace ProcessOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximumDepth': { 'type': 'integer' },
      'maximumNodes': { 'type': 'integer' }
    },
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumDepth': SchemaNode.defineNumber({ 'type': 'integer' } as const), 'maximumNodes': SchemaNode.defineNumber({ 'type': 'integer' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
