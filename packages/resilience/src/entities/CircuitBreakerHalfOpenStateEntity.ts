import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** `CircuitBreakerMachine` state: trial calls are allowed through; counts consecutive successes. */
export namespace CircuitBreakerHalfOpenStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'successCount': { 'minimum': 0, 'type': 'integer' },
      'variant': { 'const': 'halfOpen', 'type': 'string' }
    },
    'required': ['successCount', 'variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'successCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'variant': SchemaNode.defineConst({}, 'halfOpen' as const) }, ['successCount', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
