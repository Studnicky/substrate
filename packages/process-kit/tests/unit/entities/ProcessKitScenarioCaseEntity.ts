import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { JobDriveScenarioCaseEntity } from './JobDriveScenarioCaseEntity.js';
import { JobEffectsScenarioCaseEntity } from './JobEffectsScenarioCaseEntity.js';
import { JobRejectionScenarioCaseEntity } from './JobRejectionScenarioCaseEntity.js';
import { JobScheduledScenarioCaseEntity } from './JobScheduledScenarioCaseEntity.js';
import { JobStopCancelsScenarioCaseEntity } from './JobStopCancelsScenarioCaseEntity.js';

/** Union of the five ProcessKit case shapes, discriminated by `shape`. */
export namespace ProcessKitScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      JobDriveScenarioCaseEntity.Schema,
      JobEffectsScenarioCaseEntity.Schema,
      JobScheduledScenarioCaseEntity.Schema,
      JobStopCancelsScenarioCaseEntity.Schema,
      JobRejectionScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    JobDriveScenarioCaseEntity.Node,
    JobEffectsScenarioCaseEntity.Node,
    JobScheduledScenarioCaseEntity.Node,
    JobStopCancelsScenarioCaseEntity.Node,
    JobRejectionScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
