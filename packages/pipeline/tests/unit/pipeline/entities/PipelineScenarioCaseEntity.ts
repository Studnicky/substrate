import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { AsyncObserverHasNoEffectScenarioCaseEntity } from './AsyncObserverHasNoEffectScenarioCaseEntity.js';
import { DoesNotMutateOriginalInputScenarioCaseEntity } from './DoesNotMutateOriginalInputScenarioCaseEntity.js';
import { EmptyPipelineReturnsInputScenarioCaseEntity } from './EmptyPipelineReturnsInputScenarioCaseEntity.js';
import { HangingObserverHasNoEffectScenarioCaseEntity } from './HangingObserverHasNoEffectScenarioCaseEntity.js';
import { MixedSyncAsyncStagesScenarioCaseEntity } from './MixedSyncAsyncStagesScenarioCaseEntity.js';
import { MultipleStagesApplyAllScenarioCaseEntity } from './MultipleStagesApplyAllScenarioCaseEntity.js';
import { ObjectContextPassThroughScenarioCaseEntity } from './ObjectContextPassThroughScenarioCaseEntity.js';
import { SingleAsyncStageAppliesScenarioCaseEntity } from './SingleAsyncStageAppliesScenarioCaseEntity.js';
import { SingleStageAppliesScenarioCaseEntity } from './SingleStageAppliesScenarioCaseEntity.js';
import { StagesIsDefensiveSnapshotScenarioCaseEntity } from './StagesIsDefensiveSnapshotScenarioCaseEntity.js';
import { ThrowingLifecycleObserverHasNoEffectScenarioCaseEntity } from './ThrowingLifecycleObserverHasNoEffectScenarioCaseEntity.js';

/** Union of every `Pipeline.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace PipelineScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
    EmptyPipelineReturnsInputScenarioCaseEntity.Schema,
    SingleAsyncStageAppliesScenarioCaseEntity.Schema,
    SingleStageAppliesScenarioCaseEntity.Schema,
    MultipleStagesApplyAllScenarioCaseEntity.Schema,
    StagesIsDefensiveSnapshotScenarioCaseEntity.Schema,
    MixedSyncAsyncStagesScenarioCaseEntity.Schema,
    ObjectContextPassThroughScenarioCaseEntity.Schema,
    ThrowingLifecycleObserverHasNoEffectScenarioCaseEntity.Schema,
    DoesNotMutateOriginalInputScenarioCaseEntity.Schema,
    AsyncObserverHasNoEffectScenarioCaseEntity.Schema,
    HangingObserverHasNoEffectScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    EmptyPipelineReturnsInputScenarioCaseEntity.Node,
    SingleAsyncStageAppliesScenarioCaseEntity.Node,
    SingleStageAppliesScenarioCaseEntity.Node,
    MultipleStagesApplyAllScenarioCaseEntity.Node,
    StagesIsDefensiveSnapshotScenarioCaseEntity.Node,
    MixedSyncAsyncStagesScenarioCaseEntity.Node,
    ObjectContextPassThroughScenarioCaseEntity.Node,
    ThrowingLifecycleObserverHasNoEffectScenarioCaseEntity.Node,
    DoesNotMutateOriginalInputScenarioCaseEntity.Node,
    AsyncObserverHasNoEffectScenarioCaseEntity.Node,
    HangingObserverHasNoEffectScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
