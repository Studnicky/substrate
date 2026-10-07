import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** `CircuitBreakerMachine` state: calls fast-fail until `resetTimeoutMs` elapses. */
export namespace CircuitBreakerOpenStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'openedAt': { 'type': 'number' },
      'variant': { 'const': 'open', 'type': 'string' }
    },
    'required': ['openedAt', 'variant'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'openedAt': SchemaNode.defineNumber({ 'type': 'number' } as const), 'variant': SchemaNode.defineConst({}, 'open' as const) }, ['openedAt', 'variant'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
