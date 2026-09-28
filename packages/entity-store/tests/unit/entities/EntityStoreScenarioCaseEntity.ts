import type { NodeStaticType } from "@studnicky/entity/types";

import { SchemaNode } from "@studnicky/entity/types";

import { AsyncRejectionRoutedNoUnhandledScenarioCaseEntity } from "./AsyncRejectionRoutedNoUnhandledScenarioCaseEntity.js";
import { DeepDetachedGettersScenarioCaseEntity } from "./DeepDetachedGettersScenarioCaseEntity.js";
import { GetAllCacheInvalidatedScenarioCaseEntity } from "./GetAllCacheInvalidatedScenarioCaseEntity.js";
import { GetAllDefensiveSnapshotScenarioCaseEntity } from "./GetAllDefensiveSnapshotScenarioCaseEntity.js";
import { GetAllInsertionOrderScenarioCaseEntity } from "./GetAllInsertionOrderScenarioCaseEntity.js";
import { GetAllSortedScenarioCaseEntity } from "./GetAllSortedScenarioCaseEntity.js";
import { HookErrorsDeeplyDetachedScenarioCaseEntity } from "./HookErrorsDeeplyDetachedScenarioCaseEntity.js";
import { HookErrorsDefensiveCopyScenarioCaseEntity } from "./HookErrorsDefensiveCopyScenarioCaseEntity.js";
import { HookFailureRecordedBatchContinuesScenarioCaseEntity } from "./HookFailureRecordedBatchContinuesScenarioCaseEntity.js";
import { HookFailuresIsolatedPerInstanceScenarioCaseEntity } from "./HookFailuresIsolatedPerInstanceScenarioCaseEntity.js";
import { HooksAllOverriddenScenarioCaseEntity } from "./HooksAllOverriddenScenarioCaseEntity.js";
import { HooksRemoveManyScenarioCaseEntity } from "./HooksRemoveManyScenarioCaseEntity.js";
import { HooksRemoveOnlyWhenExistsScenarioCaseEntity } from "./HooksRemoveOnlyWhenExistsScenarioCaseEntity.js";
import { HooksReplaceAllCountScenarioCaseEntity } from "./HooksReplaceAllCountScenarioCaseEntity.js";
import { HooksReplaceAllEmptyScenarioCaseEntity } from "./HooksReplaceAllEmptyScenarioCaseEntity.js";
import { HooksUpsertManyScenarioCaseEntity } from "./HooksUpsertManyScenarioCaseEntity.js";
import { HooksUpsertOverwriteScenarioCaseEntity } from "./HooksUpsertOverwriteScenarioCaseEntity.js";
import { IdsSizeReflectOperationsScenarioCaseEntity } from "./IdsSizeReflectOperationsScenarioCaseEntity.js";
import { RemoveManyCountScenarioCaseEntity } from "./RemoveManyCountScenarioCaseEntity.js";
import { RemoveManyEmptyScenarioCaseEntity } from "./RemoveManyEmptyScenarioCaseEntity.js";
import { RemoveOneMissingScenarioCaseEntity } from "./RemoveOneMissingScenarioCaseEntity.js";
import { RemoveOneRemovesScenarioCaseEntity } from "./RemoveOneRemovesScenarioCaseEntity.js";
import { SetAllEmptyScenarioCaseEntity } from "./SetAllEmptyScenarioCaseEntity.js";
import { SetAllReplacesScenarioCaseEntity } from "./SetAllReplacesScenarioCaseEntity.js";
import { SnapshotRetentionPathsScenarioCaseEntity } from "./SnapshotRetentionPathsScenarioCaseEntity.js";
import { ThrowingOnRemovePreservesRemovalScenarioCaseEntity } from "./ThrowingOnRemovePreservesRemovalScenarioCaseEntity.js";
import { ThrowingOnReplaceAllPreservesSwapScenarioCaseEntity } from "./ThrowingOnReplaceAllPreservesSwapScenarioCaseEntity.js";
import { ThrowingOnUpsertPreservesStoreScenarioCaseEntity } from "./ThrowingOnUpsertPreservesStoreScenarioCaseEntity.js";
import { UpsertManyBatchScenarioCaseEntity } from "./UpsertManyBatchScenarioCaseEntity.js";
import { UpsertManyEmptyScenarioCaseEntity } from "./UpsertManyEmptyScenarioCaseEntity.js";
import { UpsertOneInsertsScenarioCaseEntity } from "./UpsertOneInsertsScenarioCaseEntity.js";
import { UpsertOneOverwritesScenarioCaseEntity } from "./UpsertOneOverwritesScenarioCaseEntity.js";

/** Union of every `EntityStore.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace EntityStoreScenarioCaseEntity {
  export const Schema = {
    oneOf: [
      AsyncRejectionRoutedNoUnhandledScenarioCaseEntity.Schema,
      DeepDetachedGettersScenarioCaseEntity.Schema,
      GetAllCacheInvalidatedScenarioCaseEntity.Schema,
      GetAllDefensiveSnapshotScenarioCaseEntity.Schema,
      GetAllInsertionOrderScenarioCaseEntity.Schema,
      GetAllSortedScenarioCaseEntity.Schema,
      HookErrorsDeeplyDetachedScenarioCaseEntity.Schema,
      HookErrorsDefensiveCopyScenarioCaseEntity.Schema,
      HookFailureRecordedBatchContinuesScenarioCaseEntity.Schema,
      HookFailuresIsolatedPerInstanceScenarioCaseEntity.Schema,
      HooksAllOverriddenScenarioCaseEntity.Schema,
      HooksRemoveManyScenarioCaseEntity.Schema,
      HooksRemoveOnlyWhenExistsScenarioCaseEntity.Schema,
      HooksReplaceAllCountScenarioCaseEntity.Schema,
      HooksReplaceAllEmptyScenarioCaseEntity.Schema,
      HooksUpsertManyScenarioCaseEntity.Schema,
      HooksUpsertOverwriteScenarioCaseEntity.Schema,
      IdsSizeReflectOperationsScenarioCaseEntity.Schema,
      RemoveManyCountScenarioCaseEntity.Schema,
      RemoveManyEmptyScenarioCaseEntity.Schema,
      RemoveOneMissingScenarioCaseEntity.Schema,
      RemoveOneRemovesScenarioCaseEntity.Schema,
      SetAllEmptyScenarioCaseEntity.Schema,
      SetAllReplacesScenarioCaseEntity.Schema,
      SnapshotRetentionPathsScenarioCaseEntity.Schema,
      ThrowingOnRemovePreservesRemovalScenarioCaseEntity.Schema,
      ThrowingOnReplaceAllPreservesSwapScenarioCaseEntity.Schema,
      ThrowingOnUpsertPreservesStoreScenarioCaseEntity.Schema,
      UpsertManyBatchScenarioCaseEntity.Schema,
      UpsertManyEmptyScenarioCaseEntity.Schema,
      UpsertOneInsertsScenarioCaseEntity.Schema,
      UpsertOneOverwritesScenarioCaseEntity.Schema,
    ],
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    AsyncRejectionRoutedNoUnhandledScenarioCaseEntity.Node,
    DeepDetachedGettersScenarioCaseEntity.Node,
    GetAllCacheInvalidatedScenarioCaseEntity.Node,
    GetAllDefensiveSnapshotScenarioCaseEntity.Node,
    GetAllInsertionOrderScenarioCaseEntity.Node,
    GetAllSortedScenarioCaseEntity.Node,
    HookErrorsDeeplyDetachedScenarioCaseEntity.Node,
    HookErrorsDefensiveCopyScenarioCaseEntity.Node,
    HookFailureRecordedBatchContinuesScenarioCaseEntity.Node,
    HookFailuresIsolatedPerInstanceScenarioCaseEntity.Node,
    HooksAllOverriddenScenarioCaseEntity.Node,
    HooksRemoveManyScenarioCaseEntity.Node,
    HooksRemoveOnlyWhenExistsScenarioCaseEntity.Node,
    HooksReplaceAllCountScenarioCaseEntity.Node,
    HooksReplaceAllEmptyScenarioCaseEntity.Node,
    HooksUpsertManyScenarioCaseEntity.Node,
    HooksUpsertOverwriteScenarioCaseEntity.Node,
    IdsSizeReflectOperationsScenarioCaseEntity.Node,
    RemoveManyCountScenarioCaseEntity.Node,
    RemoveManyEmptyScenarioCaseEntity.Node,
    RemoveOneMissingScenarioCaseEntity.Node,
    RemoveOneRemovesScenarioCaseEntity.Node,
    SetAllEmptyScenarioCaseEntity.Node,
    SetAllReplacesScenarioCaseEntity.Node,
    SnapshotRetentionPathsScenarioCaseEntity.Node,
    ThrowingOnRemovePreservesRemovalScenarioCaseEntity.Node,
    ThrowingOnReplaceAllPreservesSwapScenarioCaseEntity.Node,
    ThrowingOnUpsertPreservesStoreScenarioCaseEntity.Node,
    UpsertManyBatchScenarioCaseEntity.Node,
    UpsertManyEmptyScenarioCaseEntity.Node,
    UpsertOneInsertsScenarioCaseEntity.Node,
    UpsertOneOverwritesScenarioCaseEntity.Node,
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
