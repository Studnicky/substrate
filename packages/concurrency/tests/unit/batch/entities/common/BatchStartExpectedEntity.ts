import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{batchStartCount, total}` expected shape shared by `batchHooks.loop.spec.ts` batch-start cases. */
export namespace BatchStartExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'batchStartCount': { 'type': 'number' }, 'total': { 'type': 'number' } },
    'required': ['batchStartCount', 'total'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'batchStartCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'total': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['batchStartCount', 'total'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
