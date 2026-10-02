import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { AfterStageGetsStageOutputScenarioCaseEntity } from './AfterStageGetsStageOutputScenarioCaseEntity.js';
import { AfterStageThrowDoesNotTriggerRunErrorScenarioCaseEntity } from './AfterStageThrowDoesNotTriggerRunErrorScenarioCaseEntity.js';
import { BeforeAfterOrderScenarioCaseEntity } from './BeforeAfterOrderScenarioCaseEntity.js';
import { BeforeStageGetsPriorOutputScenarioCaseEntity } from './BeforeStageGetsPriorOutputScenarioCaseEntity.js';
import { BeforeStageThrowDoesNotTriggerRunErrorScenarioCaseEntity } from './BeforeStageThrowDoesNotTriggerRunErrorScenarioCaseEntity.js';
import { HooksCalledWithNoStagesScenarioCaseEntity } from './HooksCalledWithNoStagesScenarioCaseEntity.js';
import { NoHooksNoStagesScenarioCaseEntity } from './NoHooksNoStagesScenarioCaseEntity.js';
import { NoStageHooksWithEmptyPipelineScenarioCaseEntity } from './NoStageHooksWithEmptyPipelineScenarioCaseEntity.js';
import { OnRunCompleteThrowDoesNotTriggerRunErrorScenarioCaseEntity } from './OnRunCompleteThrowDoesNotTriggerRunErrorScenarioCaseEntity.js';
import { OnRunStartThrowDoesNotTriggerRunErrorScenarioCaseEntity } from './OnRunStartThrowDoesNotTriggerRunErrorScenarioCaseEntity.js';
import { ProtectedFnsLengthScenarioCaseEntity } from './ProtectedFnsLengthScenarioCaseEntity.js';
import { RunCompleteAfterStagesScenarioCaseEntity } from './RunCompleteAfterStagesScenarioCaseEntity.js';
import { RunCompleteObserverLeavesResultIntactScenarioCaseEntity } from './RunCompleteObserverLeavesResultIntactScenarioCaseEntity.js';
import { RunErrorOnThrowScenarioCaseEntity } from './RunErrorOnThrowScenarioCaseEntity.js';
import { RunErrorReceivesOriginalStageErrorScenarioCaseEntity } from './RunErrorReceivesOriginalStageErrorScenarioCaseEntity.js';
import { RunStartBeforeStagesScenarioCaseEntity } from './RunStartBeforeStagesScenarioCaseEntity.js';
import { RunStartObserverLeavesFirstStageInputScenarioCaseEntity } from './RunStartObserverLeavesFirstStageInputScenarioCaseEntity.js';
import { RunStartOriginalValueScenarioCaseEntity } from './RunStartOriginalValueScenarioCaseEntity.js';
import { SingleStageBeforeAfterScenarioCaseEntity } from './SingleStageBeforeAfterScenarioCaseEntity.js';
import { StageErrorBeforeRunErrorScenarioCaseEntity } from './StageErrorBeforeRunErrorScenarioCaseEntity.js';
import { StageErrorNotOnSuccessScenarioCaseEntity } from './StageErrorNotOnSuccessScenarioCaseEntity.js';
import { StageErrorOnThrowScenarioCaseEntity } from './StageErrorOnThrowScenarioCaseEntity.js';
import { StageStartAfterBeforeStageScenarioCaseEntity } from './StageStartAfterBeforeStageScenarioCaseEntity.js';
import { StageStartOrderScenarioCaseEntity } from './StageStartOrderScenarioCaseEntity.js';
import { StageSuccessBeforeAfterStageScenarioCaseEntity } from './StageSuccessBeforeAfterStageScenarioCaseEntity.js';
import { StageSuccessOutputScenarioCaseEntity } from './StageSuccessOutputScenarioCaseEntity.js';
import { ThrowingOnRunErrorScenarioCaseEntity } from './ThrowingOnRunErrorScenarioCaseEntity.js';
import { ThrowingOnStageErrorScenarioCaseEntity } from './ThrowingOnStageErrorScenarioCaseEntity.js';
import { ThrowingOnStageStartScenarioCaseEntity } from './ThrowingOnStageStartScenarioCaseEntity.js';
import { ThrowingOnStageSuccessScenarioCaseEntity } from './ThrowingOnStageSuccessScenarioCaseEntity.js';
import { TracingPipelineResultScenarioCaseEntity } from './TracingPipelineResultScenarioCaseEntity.js';

/** Union of every `PipelineSubclass.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace PipelineSubclassScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      BeforeAfterOrderScenarioCaseEntity.Schema,
      NoHooksNoStagesScenarioCaseEntity.Schema,
      SingleStageBeforeAfterScenarioCaseEntity.Schema,
      TracingPipelineResultScenarioCaseEntity.Schema,
      BeforeStageGetsPriorOutputScenarioCaseEntity.Schema,
      AfterStageGetsStageOutputScenarioCaseEntity.Schema,
      RunStartBeforeStagesScenarioCaseEntity.Schema,
      RunCompleteAfterStagesScenarioCaseEntity.Schema,
      RunStartOriginalValueScenarioCaseEntity.Schema,
      RunStartObserverLeavesFirstStageInputScenarioCaseEntity.Schema,
      RunCompleteObserverLeavesResultIntactScenarioCaseEntity.Schema,
      HooksCalledWithNoStagesScenarioCaseEntity.Schema,
      ProtectedFnsLengthScenarioCaseEntity.Schema,
      StageStartOrderScenarioCaseEntity.Schema,
      StageSuccessOutputScenarioCaseEntity.Schema,
      StageStartAfterBeforeStageScenarioCaseEntity.Schema,
      StageSuccessBeforeAfterStageScenarioCaseEntity.Schema,
      StageErrorOnThrowScenarioCaseEntity.Schema,
      StageErrorNotOnSuccessScenarioCaseEntity.Schema,
      RunErrorOnThrowScenarioCaseEntity.Schema,
      RunErrorReceivesOriginalStageErrorScenarioCaseEntity.Schema,
      StageErrorBeforeRunErrorScenarioCaseEntity.Schema,
      NoStageHooksWithEmptyPipelineScenarioCaseEntity.Schema,
      ThrowingOnStageStartScenarioCaseEntity.Schema,
      ThrowingOnStageSuccessScenarioCaseEntity.Schema,
      ThrowingOnStageErrorScenarioCaseEntity.Schema,
      ThrowingOnRunErrorScenarioCaseEntity.Schema,
      BeforeStageThrowDoesNotTriggerRunErrorScenarioCaseEntity.Schema,
      AfterStageThrowDoesNotTriggerRunErrorScenarioCaseEntity.Schema,
      OnRunStartThrowDoesNotTriggerRunErrorScenarioCaseEntity.Schema,
      OnRunCompleteThrowDoesNotTriggerRunErrorScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    BeforeAfterOrderScenarioCaseEntity.Node,
    NoHooksNoStagesScenarioCaseEntity.Node,
    SingleStageBeforeAfterScenarioCaseEntity.Node,
    TracingPipelineResultScenarioCaseEntity.Node,
    BeforeStageGetsPriorOutputScenarioCaseEntity.Node,
    AfterStageGetsStageOutputScenarioCaseEntity.Node,
    RunStartBeforeStagesScenarioCaseEntity.Node,
    RunCompleteAfterStagesScenarioCaseEntity.Node,
    RunStartOriginalValueScenarioCaseEntity.Node,
    RunStartObserverLeavesFirstStageInputScenarioCaseEntity.Node,
    RunCompleteObserverLeavesResultIntactScenarioCaseEntity.Node,
    HooksCalledWithNoStagesScenarioCaseEntity.Node,
    ProtectedFnsLengthScenarioCaseEntity.Node,
    StageStartOrderScenarioCaseEntity.Node,
    StageSuccessOutputScenarioCaseEntity.Node,
    StageStartAfterBeforeStageScenarioCaseEntity.Node,
    StageSuccessBeforeAfterStageScenarioCaseEntity.Node,
    StageErrorOnThrowScenarioCaseEntity.Node,
    StageErrorNotOnSuccessScenarioCaseEntity.Node,
    RunErrorOnThrowScenarioCaseEntity.Node,
    RunErrorReceivesOriginalStageErrorScenarioCaseEntity.Node,
    StageErrorBeforeRunErrorScenarioCaseEntity.Node,
    NoStageHooksWithEmptyPipelineScenarioCaseEntity.Node,
    ThrowingOnStageStartScenarioCaseEntity.Node,
    ThrowingOnStageSuccessScenarioCaseEntity.Node,
    ThrowingOnStageErrorScenarioCaseEntity.Node,
    ThrowingOnRunErrorScenarioCaseEntity.Node,
    BeforeStageThrowDoesNotTriggerRunErrorScenarioCaseEntity.Node,
    AfterStageThrowDoesNotTriggerRunErrorScenarioCaseEntity.Node,
    OnRunStartThrowDoesNotTriggerRunErrorScenarioCaseEntity.Node,
    OnRunCompleteThrowDoesNotTriggerRunErrorScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
