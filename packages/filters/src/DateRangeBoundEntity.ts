import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

/** JSON-safe scalar accepted as a declarative date range bound. */
export namespace DateRangeBoundEntity {
  export const Schema = {
    'anyOf': [{ 'type': 'number' }, { 'type': 'string' }]
  } as const;

  export const Node = SchemaNode.defineAnyOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
