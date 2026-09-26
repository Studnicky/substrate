import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { ProcessDefaultMaxConcurrentScenarioCaseEntity } from './ProcessDefaultMaxConcurrentScenarioCaseEntity.js';
import { ProcessEmptyScenarioCaseEntity } from './ProcessEmptyScenarioCaseEntity.js';
import { ProcessInvalidMaxConcurrentScenarioCaseEntity } from './ProcessInvalidMaxConcurrentScenarioCaseEntity.js';
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
      ProcessInvalidMaxConcurrentScenarioCaseEntity.Schema,
      ProcessOrderScenarioCaseEntity.Schema,
      ProcessDefaultMaxConcurrentScenarioCaseEntity.Schema,
      ProcessWaitsForBatchCompletionScenarioCaseEntity.Schema,
      ProcessPropagatesErrorsScenarioCaseEntity.Schema,
      ProcessStopsOnFirstErrorScenarioCaseEntity.Schema,
      ProcessReturnsResultsScenarioCaseEntity.Schema,
      ProcessSettledReturnsResultsScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    ProcessEmptyScenarioCaseEntity.Node,
    ProcessSingleBatchScenarioCaseEntity.Node,
    ProcessSingleBatchConcurrentScenarioCaseEntity.Node,
    ProcessMultiBatchScenarioCaseEntity.Node,
    ProcessInvalidMaxConcurrentScenarioCaseEntity.Node,
    ProcessOrderScenarioCaseEntity.Node,
    ProcessDefaultMaxConcurrentScenarioCaseEntity.Node,
    ProcessWaitsForBatchCompletionScenarioCaseEntity.Node,
    ProcessPropagatesErrorsScenarioCaseEntity.Node,
    ProcessStopsOnFirstErrorScenarioCaseEntity.Node,
    ProcessReturnsResultsScenarioCaseEntity.Node,
    ProcessSettledReturnsResultsScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
