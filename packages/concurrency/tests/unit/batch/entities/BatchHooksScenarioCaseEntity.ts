import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { AsyncHookErrorSafeScenarioCaseEntity } from './AsyncHookErrorSafeScenarioCaseEntity.js';
import { ContinueOnHookErrorScenarioCaseEntity } from './ContinueOnHookErrorScenarioCaseEntity.js';
import { HookErrorsOwnedByInstanceScenarioCaseEntity } from './HookErrorsOwnedByInstanceScenarioCaseEntity.js';
import { OnBatchCompleteAbortScenarioCaseEntity } from './OnBatchCompleteAbortScenarioCaseEntity.js';
import { OnBatchCompleteScenarioCaseEntity } from './OnBatchCompleteScenarioCaseEntity.js';
import { OnBatchStartScenarioCaseEntity } from './OnBatchStartScenarioCaseEntity.js';
import { OnConcurrencySaturatedScenarioCaseEntity } from './OnConcurrencySaturatedScenarioCaseEntity.js';
import { OnItemErrorOrderScenarioCaseEntity } from './OnItemErrorOrderScenarioCaseEntity.js';
import { OnItemErrorScenarioCaseEntity } from './OnItemErrorScenarioCaseEntity.js';
import { OnItemSettledScenarioCaseEntity } from './OnItemSettledScenarioCaseEntity.js';
import { OnItemStartScenarioCaseEntity } from './OnItemStartScenarioCaseEntity.js';
import { OnItemSuccessOrderScenarioCaseEntity } from './OnItemSuccessOrderScenarioCaseEntity.js';
import { OnItemSuccessScenarioCaseEntity } from './OnItemSuccessScenarioCaseEntity.js';
import { ProcessSettledAllFailScenarioCaseEntity } from './ProcessSettledAllFailScenarioCaseEntity.js';
import { ProcessSettledBatchCompleteScenarioCaseEntity } from './ProcessSettledBatchCompleteScenarioCaseEntity.js';
import { ProcessSettledBatchStartScenarioCaseEntity } from './ProcessSettledBatchStartScenarioCaseEntity.js';
import { ProcessSettledIndicesScenarioCaseEntity } from './ProcessSettledIndicesScenarioCaseEntity.js';
import { ProcessSettledItemSettledScenarioCaseEntity } from './ProcessSettledItemSettledScenarioCaseEntity.js';
import { ProcessSettledItemSuccessErrorScenarioCaseEntity } from './ProcessSettledItemSuccessErrorScenarioCaseEntity.js';
import { ProcessSettledSaturationScenarioCaseEntity } from './ProcessSettledSaturationScenarioCaseEntity.js';
import { ThrowingCompleteHookScenarioCaseEntity } from './ThrowingCompleteHookScenarioCaseEntity.js';
import { ThrowingSuccessHookScenarioCaseEntity } from './ThrowingSuccessHookScenarioCaseEntity.js';

/** Union of every `batchHooks.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace BatchHooksScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      OnBatchStartScenarioCaseEntity.Schema,
      OnItemStartScenarioCaseEntity.Schema,
      OnItemSuccessScenarioCaseEntity.Schema,
      OnItemErrorScenarioCaseEntity.Schema,
      OnItemSettledScenarioCaseEntity.Schema,
      OnItemSuccessOrderScenarioCaseEntity.Schema,
      OnItemErrorOrderScenarioCaseEntity.Schema,
      OnConcurrencySaturatedScenarioCaseEntity.Schema,
      OnBatchCompleteScenarioCaseEntity.Schema,
      OnBatchCompleteAbortScenarioCaseEntity.Schema,
      ProcessSettledBatchStartScenarioCaseEntity.Schema,
      ProcessSettledItemSuccessErrorScenarioCaseEntity.Schema,
      ProcessSettledItemSettledScenarioCaseEntity.Schema,
      ProcessSettledBatchCompleteScenarioCaseEntity.Schema,
      ProcessSettledSaturationScenarioCaseEntity.Schema,
      ProcessSettledIndicesScenarioCaseEntity.Schema,
      ProcessSettledAllFailScenarioCaseEntity.Schema,
      ThrowingSuccessHookScenarioCaseEntity.Schema,
      ThrowingCompleteHookScenarioCaseEntity.Schema,
      ContinueOnHookErrorScenarioCaseEntity.Schema,
      AsyncHookErrorSafeScenarioCaseEntity.Schema,
      HookErrorsOwnedByInstanceScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    OnBatchStartScenarioCaseEntity.Node,
    OnItemStartScenarioCaseEntity.Node,
    OnItemSuccessScenarioCaseEntity.Node,
    OnItemErrorScenarioCaseEntity.Node,
    OnItemSettledScenarioCaseEntity.Node,
    OnItemSuccessOrderScenarioCaseEntity.Node,
    OnItemErrorOrderScenarioCaseEntity.Node,
    OnConcurrencySaturatedScenarioCaseEntity.Node,
    OnBatchCompleteScenarioCaseEntity.Node,
    OnBatchCompleteAbortScenarioCaseEntity.Node,
    ProcessSettledBatchStartScenarioCaseEntity.Node,
    ProcessSettledItemSuccessErrorScenarioCaseEntity.Node,
    ProcessSettledItemSettledScenarioCaseEntity.Node,
    ProcessSettledBatchCompleteScenarioCaseEntity.Node,
    ProcessSettledSaturationScenarioCaseEntity.Node,
    ProcessSettledIndicesScenarioCaseEntity.Node,
    ProcessSettledAllFailScenarioCaseEntity.Node,
    ThrowingSuccessHookScenarioCaseEntity.Node,
    ThrowingCompleteHookScenarioCaseEntity.Node,
    ContinueOnHookErrorScenarioCaseEntity.Node,
    AsyncHookErrorSafeScenarioCaseEntity.Node,
    HookErrorsOwnedByInstanceScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
