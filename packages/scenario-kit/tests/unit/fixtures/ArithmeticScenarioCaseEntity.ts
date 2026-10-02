import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { AddScenarioCaseEntity } from './AddScenarioCaseEntity.js';
import { MultiplyScenarioCaseEntity } from './MultiplyScenarioCaseEntity.js';

/** Union of the two arithmetic case shapes, discriminated by `shape`. */
export namespace ArithmeticScenarioCaseEntity {
  export const Schema = {
    'oneOf': [AddScenarioCaseEntity.Schema, MultiplyScenarioCaseEntity.Schema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [AddScenarioCaseEntity.Node, MultiplyScenarioCaseEntity.Node]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
