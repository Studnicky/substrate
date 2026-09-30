import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{itemSettledCount, rejectedMessage}` expected shape shared by `batchHooks.loop.spec.ts` settled cases. */
export namespace ItemSettledExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'itemSettledCount': { 'type': 'number' }, 'rejectedMessage': { 'minLength': 1, 'type': 'string' } },
    'required': ['itemSettledCount', 'rejectedMessage'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'itemSettledCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'rejectedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
  }, ['itemSettledCount', 'rejectedMessage'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
