import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { BrowserExampleScenarioEntity } from './BrowserExampleScenarioEntity.js';
import { ImportsExampleScenarioEntity } from './ImportsExampleScenarioEntity.js';
import { WorkerEntryScenarioEntity } from './WorkerEntryScenarioEntity.js';

/** Union of the three example smoke-scenario shapes, discriminated by `shape`. */
export namespace ExampleScenarioEntity {
  export const Schema = {
    'oneOf': [ImportsExampleScenarioEntity.Schema, BrowserExampleScenarioEntity.Schema, WorkerEntryScenarioEntity.Schema]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [ImportsExampleScenarioEntity.Node, BrowserExampleScenarioEntity.Node, WorkerEntryScenarioEntity.Node]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
