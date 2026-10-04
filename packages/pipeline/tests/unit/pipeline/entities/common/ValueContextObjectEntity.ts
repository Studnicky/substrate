import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{count, label}` context object `object-context-pass-through` passes through pipeline stages. */
export namespace ValueContextObjectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'count': { 'type': 'number' }, 'label': { 'minLength': 1, 'type': 'string' } },
    'required': ['count', 'label'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'count': SchemaNode.defineNumber({ 'type': 'number' } as const), 'label': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['count', 'label'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
