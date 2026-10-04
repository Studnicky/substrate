import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{message, semaphore: {permits}}` input shape shared by several `Semaphore.loop.spec.ts` hook cases. */
export namespace MessageSemaphorePermitsInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'message': { 'minLength': 1, 'type': 'string' },
      'semaphore': {
        'additionalProperties': false,
        'properties': { 'permits': { 'type': 'number' } },
        'required': ['permits'],
        'type': 'object'
      }
    },
    'required': ['message', 'semaphore'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'semaphore': SchemaNode.defineObject({ 'type': 'object' } as const, { 'permits': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['permits'] as const, { 'additionalProperties': false, 'patternProperties': {} })
  }, ['message', 'semaphore'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
