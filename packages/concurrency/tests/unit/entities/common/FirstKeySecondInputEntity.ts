import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{first, key, second}` input shape shared by `Channel.loop.spec.ts` enqueue-hook cases. */
export namespace FirstKeySecondInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'first': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' }, 'second': { 'type': 'number' } },
    'required': ['first', 'key', 'second'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'first': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'second': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['first', 'key', 'second'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
