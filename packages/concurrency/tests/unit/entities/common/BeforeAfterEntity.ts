import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{before, after}` shape shared by the `Channel.loop.spec.ts` onClose-hooks input and expected. */
export namespace BeforeAfterEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'after': { 'type': 'number' }, 'before': { 'type': 'number' } },
    'required': ['after', 'before'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'after': SchemaNode.defineNumber({ 'type': 'number' } as const), 'before': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['after', 'before'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
