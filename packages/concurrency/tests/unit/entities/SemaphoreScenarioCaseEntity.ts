import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { AcquireReleaseCycleScenarioCaseEntity } from './AcquireReleaseCycleScenarioCaseEntity.js';
import { AsyncOnAcquireRejectScenarioCaseEntity } from './AsyncOnAcquireRejectScenarioCaseEntity.js';
import { AsyncOnAcquireReserveScenarioCaseEntity } from './AsyncOnAcquireReserveScenarioCaseEntity.js';
import { AsyncOnAcquireWaitRejectScenarioCaseEntity } from './AsyncOnAcquireWaitRejectScenarioCaseEntity.js';
import { AsyncOnContendedRejectScenarioCaseEntity } from './AsyncOnContendedRejectScenarioCaseEntity.js';
import { DoubleReleaseSafeScenarioCaseEntity } from './DoubleReleaseSafeScenarioCaseEntity.js';
import { FifoSwapScenarioCaseEntity } from './FifoSwapScenarioCaseEntity.js';
import { GetterReflectsPermitsScenarioCaseEntity } from './GetterReflectsPermitsScenarioCaseEntity.js';
import { OnAcquireHooksScenarioCaseEntity } from './OnAcquireHooksScenarioCaseEntity.js';
import { OnAcquireWaitHooksScenarioCaseEntity } from './OnAcquireWaitHooksScenarioCaseEntity.js';
import { OnAcquireWaitMultiwaiterScenarioCaseEntity } from './OnAcquireWaitMultiwaiterScenarioCaseEntity.js';
import { OnReleaseDelegatedHooksScenarioCaseEntity } from './OnReleaseDelegatedHooksScenarioCaseEntity.js';
import { OnReleaseHooksScenarioCaseEntity } from './OnReleaseHooksScenarioCaseEntity.js';
import { QueueWaitersScenarioCaseEntity } from './QueueWaitersScenarioCaseEntity.js';
import { RejectFractionalScenarioCaseEntity } from './RejectFractionalScenarioCaseEntity.js';
import { RejectNegativeScenarioCaseEntity } from './RejectNegativeScenarioCaseEntity.js';
import { RejectZeroScenarioCaseEntity } from './RejectZeroScenarioCaseEntity.js';
import { ThrowingOnAcquireScenarioCaseEntity } from './ThrowingOnAcquireScenarioCaseEntity.js';
import { ThrowingOnContendedScenarioCaseEntity } from './ThrowingOnContendedScenarioCaseEntity.js';
import { WithPermitRunsScenarioCaseEntity } from './WithPermitRunsScenarioCaseEntity.js';
import { WithPermitThrowsScenarioCaseEntity } from './WithPermitThrowsScenarioCaseEntity.js';

/** Union of every `Semaphore.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace SemaphoreScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      RejectZeroScenarioCaseEntity.Schema,
      RejectFractionalScenarioCaseEntity.Schema,
      RejectNegativeScenarioCaseEntity.Schema,
      GetterReflectsPermitsScenarioCaseEntity.Schema,
      AcquireReleaseCycleScenarioCaseEntity.Schema,
      DoubleReleaseSafeScenarioCaseEntity.Schema,
      QueueWaitersScenarioCaseEntity.Schema,
      WithPermitRunsScenarioCaseEntity.Schema,
      WithPermitThrowsScenarioCaseEntity.Schema,
      OnAcquireHooksScenarioCaseEntity.Schema,
      OnAcquireWaitHooksScenarioCaseEntity.Schema,
      OnAcquireWaitMultiwaiterScenarioCaseEntity.Schema,
      OnReleaseHooksScenarioCaseEntity.Schema,
      OnReleaseDelegatedHooksScenarioCaseEntity.Schema,
      ThrowingOnAcquireScenarioCaseEntity.Schema,
      ThrowingOnContendedScenarioCaseEntity.Schema,
      AsyncOnAcquireRejectScenarioCaseEntity.Schema,
      AsyncOnAcquireReserveScenarioCaseEntity.Schema,
      AsyncOnAcquireWaitRejectScenarioCaseEntity.Schema,
      AsyncOnContendedRejectScenarioCaseEntity.Schema,
      FifoSwapScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    RejectZeroScenarioCaseEntity.Node,
    RejectFractionalScenarioCaseEntity.Node,
    RejectNegativeScenarioCaseEntity.Node,
    GetterReflectsPermitsScenarioCaseEntity.Node,
    AcquireReleaseCycleScenarioCaseEntity.Node,
    DoubleReleaseSafeScenarioCaseEntity.Node,
    QueueWaitersScenarioCaseEntity.Node,
    WithPermitRunsScenarioCaseEntity.Node,
    WithPermitThrowsScenarioCaseEntity.Node,
    OnAcquireHooksScenarioCaseEntity.Node,
    OnAcquireWaitHooksScenarioCaseEntity.Node,
    OnAcquireWaitMultiwaiterScenarioCaseEntity.Node,
    OnReleaseHooksScenarioCaseEntity.Node,
    OnReleaseDelegatedHooksScenarioCaseEntity.Node,
    ThrowingOnAcquireScenarioCaseEntity.Node,
    ThrowingOnContendedScenarioCaseEntity.Node,
    AsyncOnAcquireRejectScenarioCaseEntity.Node,
    AsyncOnAcquireReserveScenarioCaseEntity.Node,
    AsyncOnAcquireWaitRejectScenarioCaseEntity.Node,
    AsyncOnContendedRejectScenarioCaseEntity.Node,
    FifoSwapScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
