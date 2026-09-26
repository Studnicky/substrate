import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace VisibleRangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'end': { 'type': 'number' },
      'start': { 'type': 'number' }
    },
    'required': ['end', 'start'],
    'type': 'object'
  } as const;

  /** Inclusive `[start, end]` index range of currently visible items. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'end': SchemaNode.defineNumber({ 'type': 'number' } as const), 'start': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['end', 'start'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
