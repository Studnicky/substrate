import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EnrichNoneScenarioCaseEntity } from './EnrichNoneScenarioCaseEntity.js';
import { EnrichPartialScenarioCaseEntity } from './EnrichPartialScenarioCaseEntity.js';
import { EnrichValueScenarioCaseEntity } from './EnrichValueScenarioCaseEntity.js';
import { FilterAllScenarioCaseEntity } from './FilterAllScenarioCaseEntity.js';
import { FilterAsyncScenarioCaseEntity } from './FilterAsyncScenarioCaseEntity.js';
import { FilterEmptyScenarioCaseEntity } from './FilterEmptyScenarioCaseEntity.js';
import { FilterSyncScenarioCaseEntity } from './FilterSyncScenarioCaseEntity.js';
import { MergeEmptyScenarioCaseEntity } from './MergeEmptyScenarioCaseEntity.js';
import { MergeHighVolumeScenarioCaseEntity } from './MergeHighVolumeScenarioCaseEntity.js';
import { MergePropagatesErrorScenarioCaseEntity } from './MergePropagatesErrorScenarioCaseEntity.js';
import { MergeSingleScenarioCaseEntity } from './MergeSingleScenarioCaseEntity.js';
import { MergeTwoSourcesScenarioCaseEntity } from './MergeTwoSourcesScenarioCaseEntity.js';

/** Union of every `AsyncIter.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace AsyncIterScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      MergeEmptyScenarioCaseEntity.Schema,
      MergeSingleScenarioCaseEntity.Schema,
      MergeTwoSourcesScenarioCaseEntity.Schema,
      MergePropagatesErrorScenarioCaseEntity.Schema,
      MergeHighVolumeScenarioCaseEntity.Schema,
      FilterSyncScenarioCaseEntity.Schema,
      FilterEmptyScenarioCaseEntity.Schema,
      FilterAllScenarioCaseEntity.Schema,
      FilterAsyncScenarioCaseEntity.Schema,
      EnrichValueScenarioCaseEntity.Schema,
      EnrichPartialScenarioCaseEntity.Schema,
      EnrichNoneScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    MergeEmptyScenarioCaseEntity.Node,
    MergeSingleScenarioCaseEntity.Node,
    MergeTwoSourcesScenarioCaseEntity.Node,
    MergePropagatesErrorScenarioCaseEntity.Node,
    MergeHighVolumeScenarioCaseEntity.Node,
    FilterSyncScenarioCaseEntity.Node,
    FilterEmptyScenarioCaseEntity.Node,
    FilterAllScenarioCaseEntity.Node,
    FilterAsyncScenarioCaseEntity.Node,
    EnrichValueScenarioCaseEntity.Node,
    EnrichPartialScenarioCaseEntity.Node,
    EnrichNoneScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
