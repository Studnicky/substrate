import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Tri-state health verdict shared by individual checks and aggregate evaluations. */
export namespace HealthStatusEntity {
  export const Schema = {
    'enum': ['healthy', 'degraded', 'unhealthy'],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, ['healthy', 'degraded', 'unhealthy'] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
