import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { AsyncTimeoutHookScenarioCaseEntity } from './AsyncTimeoutHookScenarioCaseEntity.js';
import { CoalesceStartHooksScenarioCaseEntity } from './CoalesceStartHooksScenarioCaseEntity.js';
import { FactoryErrorCleanupScenarioCaseEntity } from './FactoryErrorCleanupScenarioCaseEntity.js';
import { FactoryThrowScenarioCaseEntity } from './FactoryThrowScenarioCaseEntity.js';
import { IndependentKeysCoalesceScenarioCaseEntity } from './IndependentKeysCoalesceScenarioCaseEntity.js';
import { InflightStateScenarioCaseEntity } from './InflightStateScenarioCaseEntity.js';
import { JoinHookRejectsScenarioCaseEntity } from './JoinHookRejectsScenarioCaseEntity.js';
import { NoTimeoutScenarioCaseEntity } from './NoTimeoutScenarioCaseEntity.js';
import { RejectingStartHookScenarioCaseEntity } from './RejectingStartHookScenarioCaseEntity.js';
import { SequentialCallsScenarioCaseEntity } from './SequentialCallsScenarioCaseEntity.js';
import { SettledFailureScenarioCaseEntity } from './SettledFailureScenarioCaseEntity.js';
import { SettledSuccessScenarioCaseEntity } from './SettledSuccessScenarioCaseEntity.js';
import { SharedFactoryScenarioCaseEntity } from './SharedFactoryScenarioCaseEntity.js';
import { StartGateScenarioCaseEntity } from './StartGateScenarioCaseEntity.js';
import { ThrowingSettledHookScenarioCaseEntity } from './ThrowingSettledHookScenarioCaseEntity.js';
import { TimeoutRejectsScenarioCaseEntity } from './TimeoutRejectsScenarioCaseEntity.js';
import { TimeoutSecondCallerScenarioCaseEntity } from './TimeoutSecondCallerScenarioCaseEntity.js';

/** Union of every `Coalesce.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace CoalesceScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      SharedFactoryScenarioCaseEntity.Schema,
      IndependentKeysCoalesceScenarioCaseEntity.Schema,
      InflightStateScenarioCaseEntity.Schema,
      FactoryErrorCleanupScenarioCaseEntity.Schema,
      FactoryThrowScenarioCaseEntity.Schema,
      SequentialCallsScenarioCaseEntity.Schema,
      CoalesceStartHooksScenarioCaseEntity.Schema,
      StartGateScenarioCaseEntity.Schema,
      SettledSuccessScenarioCaseEntity.Schema,
      SettledFailureScenarioCaseEntity.Schema,
      JoinHookRejectsScenarioCaseEntity.Schema,
      NoTimeoutScenarioCaseEntity.Schema,
      TimeoutRejectsScenarioCaseEntity.Schema,
      TimeoutSecondCallerScenarioCaseEntity.Schema,
      AsyncTimeoutHookScenarioCaseEntity.Schema,
      RejectingStartHookScenarioCaseEntity.Schema,
      ThrowingSettledHookScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf([
    SharedFactoryScenarioCaseEntity.Node,
    IndependentKeysCoalesceScenarioCaseEntity.Node,
    InflightStateScenarioCaseEntity.Node,
    FactoryErrorCleanupScenarioCaseEntity.Node,
    FactoryThrowScenarioCaseEntity.Node,
    SequentialCallsScenarioCaseEntity.Node,
    CoalesceStartHooksScenarioCaseEntity.Node,
    StartGateScenarioCaseEntity.Node,
    SettledSuccessScenarioCaseEntity.Node,
    SettledFailureScenarioCaseEntity.Node,
    JoinHookRejectsScenarioCaseEntity.Node,
    NoTimeoutScenarioCaseEntity.Node,
    TimeoutRejectsScenarioCaseEntity.Node,
    TimeoutSecondCallerScenarioCaseEntity.Node,
    AsyncTimeoutHookScenarioCaseEntity.Node,
    RejectingStartHookScenarioCaseEntity.Node,
    ThrowingSettledHookScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
