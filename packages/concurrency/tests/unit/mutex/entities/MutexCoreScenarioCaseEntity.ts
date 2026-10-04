import type {
  EntityCreateFunctionInterface,
  EntityIntakeFunctionInterface,
  EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';

import { MutexCoreScenarioDefinition } from '../MutexCoreScenarioDefinition.js';

/** The mutex core scenario entity exposes the Node-first scenario contract to the test suite. */
export namespace MutexCoreScenarioCaseEntity {
  export const Schema = { ...MutexCoreScenarioDefinition.Schema } as const;
  export const Node = MutexCoreScenarioDefinition.Node;
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> =
    EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> =
    EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> =
    EntityCompiler.compileCreate<Type>(Schema);
}
