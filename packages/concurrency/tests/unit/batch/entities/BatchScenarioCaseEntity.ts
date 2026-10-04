import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { ProcessDefaultMaximumConcurrentScenarioCaseEntity } from './ProcessDefaultMaximumConcurrentScenarioCaseEntity.js';
import { ProcessEmptyScenarioCaseEntity } from './ProcessEmptyScenarioCaseEntity.js';
import { ProcessInvalidMaximumConcurrentScenarioCaseEntity } from './ProcessInvalidMaximumConcurrentScenarioCaseEntity.js';
import { ProcessMultiBatchScenarioCaseEntity } from './ProcessMultiBatchScenarioCaseEntity.js';
import { ProcessOrderScenarioCaseEntity } from './ProcessOrderScenarioCaseEntity.js';
import { ProcessPropagatesErrorsScenarioCaseEntity } from './ProcessPropagatesErrorsScenarioCaseEntity.js';
import { ProcessReturnsResultsScenarioCaseEntity } from './ProcessReturnsResultsScenarioCaseEntity.js';
import { ProcessSettledReturnsResultsScenarioCaseEntity } from './ProcessSettledReturnsResultsScenarioCaseEntity.js';
import { ProcessSingleBatchConcurrentScenarioCaseEntity } from './ProcessSingleBatchConcurrentScenarioCaseEntity.js';
import { ProcessSingleBatchScenarioCaseEntity } from './ProcessSingleBatchScenarioCaseEntity.js';
import { ProcessStopsOnFirstErrorScenarioCaseEntity } from './ProcessStopsOnFirstErrorScenarioCaseEntity.js';
import { ProcessWaitsForBatchCompletionScenarioCaseEntity } from './ProcessWaitsForBatchCompletionScenarioCaseEntity.js';

/** Union of every `batch.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace BatchScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      ProcessEmptyScenarioCaseEntity.Schema,
      ProcessSingleBatchScenarioCaseEntity.Schema,
      ProcessSingleBatchConcurrentScenarioCaseEntity.Schema,
      ProcessMultiBatchScenarioCaseEntity.Schema,
      ProcessInvalidMaximumConcurrentScenarioCaseEntity.Schema,
      ProcessOrderScenarioCaseEntity.Schema,
      ProcessDefaultMaximumConcurrentScenarioCaseEntity.Schema,
      ProcessWaitsForBatchCompletionScenarioCaseEntity.Schema,
      ProcessPropagatesErrorsScenarioCaseEntity.Schema,
      ProcessStopsOnFirstErrorScenarioCaseEntity.Schema,
      ProcessReturnsResultsScenarioCaseEntity.Schema,
      ProcessSettledReturnsResultsScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ProcessEmptyScenarioCaseEntity.Node,
    ProcessSingleBatchScenarioCaseEntity.Node,
    ProcessSingleBatchConcurrentScenarioCaseEntity.Node,
    ProcessMultiBatchScenarioCaseEntity.Node,
    ProcessInvalidMaximumConcurrentScenarioCaseEntity.Node,
    ProcessOrderScenarioCaseEntity.Node,
    ProcessDefaultMaximumConcurrentScenarioCaseEntity.Node,
    ProcessWaitsForBatchCompletionScenarioCaseEntity.Node,
    ProcessPropagatesErrorsScenarioCaseEntity.Node,
    ProcessStopsOnFirstErrorScenarioCaseEntity.Node,
    ProcessReturnsResultsScenarioCaseEntity.Node,
    ProcessSettledReturnsResultsScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
