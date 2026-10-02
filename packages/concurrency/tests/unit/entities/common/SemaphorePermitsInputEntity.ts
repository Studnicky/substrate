import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{semaphore: {permits}}` input shape shared by most `Semaphore.loop.spec.ts` cases. */
export namespace SemaphorePermitsInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'semaphore': {
        'additionalProperties': false,
        'properties': { 'permits': { 'type': 'number' } },
        'required': ['permits'],
        'type': 'object'
      }
    },
    'required': ['semaphore'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'semaphore': SchemaNode.defineObject({ 'type': 'object' } as const, { 'permits': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['permits'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  }, ['semaphore'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
