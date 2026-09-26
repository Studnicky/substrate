import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { AsyncEnqueueHookScenarioCaseEntity } from './AsyncEnqueueHookScenarioCaseEntity.js';
import { BufferedPublishScenarioCaseEntity } from './BufferedPublishScenarioCaseEntity.js';
import { CloseTerminatesScenarioCaseEntity } from './CloseTerminatesScenarioCaseEntity.js';
import { DequeueHookErrorScenarioCaseEntity } from './DequeueHookErrorScenarioCaseEntity.js';
import { DuplicateSubscribeScenarioCaseEntity } from './DuplicateSubscribeScenarioCaseEntity.js';
import { EnqueueRollbackScenarioCaseEntity } from './EnqueueRollbackScenarioCaseEntity.js';
import { HighWaterMarkScenarioCaseEntity } from './HighWaterMarkScenarioCaseEntity.js';
import { IndependentKeysScenarioCaseEntity } from './IndependentKeysScenarioCaseEntity.js';
import { LiveSubscribeScenarioCaseEntity } from './LiveSubscribeScenarioCaseEntity.js';
import { NoHighWaterMarkScenarioCaseEntity } from './NoHighWaterMarkScenarioCaseEntity.js';
import { OnCloseHooksScenarioCaseEntity } from './OnCloseHooksScenarioCaseEntity.js';
import { OnDequeueHooksScenarioCaseEntity } from './OnDequeueHooksScenarioCaseEntity.js';
import { OnEnqueueHooksScenarioCaseEntity } from './OnEnqueueHooksScenarioCaseEntity.js';
import { OnPublishDroppedHooksScenarioCaseEntity } from './OnPublishDroppedHooksScenarioCaseEntity.js';
import { PublishAfterCloseScenarioCaseEntity } from './PublishAfterCloseScenarioCaseEntity.js';

/** Union of every `Channel.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace ChannelScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      BufferedPublishScenarioCaseEntity.Schema,
      LiveSubscribeScenarioCaseEntity.Schema,
      CloseTerminatesScenarioCaseEntity.Schema,
      IndependentKeysScenarioCaseEntity.Schema,
      PublishAfterCloseScenarioCaseEntity.Schema,
      DuplicateSubscribeScenarioCaseEntity.Schema,
      OnEnqueueHooksScenarioCaseEntity.Schema,
      OnDequeueHooksScenarioCaseEntity.Schema,
      OnPublishDroppedHooksScenarioCaseEntity.Schema,
      OnCloseHooksScenarioCaseEntity.Schema,
      NoHighWaterMarkScenarioCaseEntity.Schema,
      HighWaterMarkScenarioCaseEntity.Schema,
      EnqueueRollbackScenarioCaseEntity.Schema,
      DequeueHookErrorScenarioCaseEntity.Schema,
      AsyncEnqueueHookScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    BufferedPublishScenarioCaseEntity.Node,
    LiveSubscribeScenarioCaseEntity.Node,
    CloseTerminatesScenarioCaseEntity.Node,
    IndependentKeysScenarioCaseEntity.Node,
    PublishAfterCloseScenarioCaseEntity.Node,
    DuplicateSubscribeScenarioCaseEntity.Node,
    OnEnqueueHooksScenarioCaseEntity.Node,
    OnDequeueHooksScenarioCaseEntity.Node,
    OnPublishDroppedHooksScenarioCaseEntity.Node,
    OnCloseHooksScenarioCaseEntity.Node,
    NoHighWaterMarkScenarioCaseEntity.Node,
    HighWaterMarkScenarioCaseEntity.Node,
    EnqueueRollbackScenarioCaseEntity.Node,
    DequeueHookErrorScenarioCaseEntity.Node,
    AsyncEnqueueHookScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
