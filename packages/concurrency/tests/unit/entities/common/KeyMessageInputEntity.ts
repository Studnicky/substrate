import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{key, message}` input shape shared by several `Coalesce.loop.spec.ts` failure cases. */
export namespace KeyMessageInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'key': { 'minLength': 1, 'type': 'string' }, 'message': { 'minLength': 1, 'type': 'string' } },
    'required': ['key', 'message'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  }, ['key', 'message'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
