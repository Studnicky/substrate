import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/**
 * String-literal union of all valid temporal granularity values.
 * Use this type for parameters and config fields; use DateGranularity enum
 * as a convenience for building values.
 */
export namespace DateGranularityValueEntity {
  export const Schema = {
    'enum': ['day', 'month', 'quarter', 'week', 'year'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['day', 'month', 'quarter', 'week', 'year'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
