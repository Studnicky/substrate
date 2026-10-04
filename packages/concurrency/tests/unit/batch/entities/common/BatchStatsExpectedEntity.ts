import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

/** The `{failed, succeeded, total}` batch-stats shape shared by several `batchHooks.loop.spec.ts` cases. */
export namespace BatchStatsExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'failed': { 'type': 'number' }, 'succeeded': { 'type': 'number' }, 'total': { 'type': 'number' } },
    'required': ['failed', 'succeeded', 'total'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'failed': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'succeeded': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'total': SchemaNode.defineNumber({ 'type': 'number' } as const)
  }, ['failed', 'succeeded', 'total'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
