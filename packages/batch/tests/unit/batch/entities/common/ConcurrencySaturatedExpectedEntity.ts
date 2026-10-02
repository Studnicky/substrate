import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{concurrencySaturatedCount}` expected shape shared by `batchHooks.loop.spec.ts` saturation cases. */
export namespace ConcurrencySaturatedExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'concurrencySaturatedCount': { 'type': 'number' } },
    'required': ['concurrencySaturatedCount'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencySaturatedCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['concurrencySaturatedCount'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
