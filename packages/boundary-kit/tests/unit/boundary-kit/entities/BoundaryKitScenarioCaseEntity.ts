import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CircuitBreakerOpenScenarioCaseEntity } from './CircuitBreakerOpenScenarioCaseEntity.js';
import { DefaultRetryScenarioCaseEntity } from './DefaultRetryScenarioCaseEntity.js';
import { PlainConfigScenarioCaseEntity } from './PlainConfigScenarioCaseEntity.js';
import { PrebuiltInstancesScenarioCaseEntity } from './PrebuiltInstancesScenarioCaseEntity.js';
import { ThrottleBoundScenarioCaseEntity } from './ThrottleBoundScenarioCaseEntity.js';
import { UndefinedResultVsAbortScenarioCaseEntity } from './UndefinedResultVsAbortScenarioCaseEntity.js';

/** Union of every `boundary-kit.loop.spec.ts` scenario case shape, discriminated by `shape`. */
export namespace BoundaryKitScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      PlainConfigScenarioCaseEntity.Schema,
      DefaultRetryScenarioCaseEntity.Schema,
      PrebuiltInstancesScenarioCaseEntity.Schema,
      ThrottleBoundScenarioCaseEntity.Schema,
      CircuitBreakerOpenScenarioCaseEntity.Schema,
      UndefinedResultVsAbortScenarioCaseEntity.Schema
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    PlainConfigScenarioCaseEntity.Node,
    DefaultRetryScenarioCaseEntity.Node,
    PrebuiltInstancesScenarioCaseEntity.Node,
    ThrottleBoundScenarioCaseEntity.Node,
    CircuitBreakerOpenScenarioCaseEntity.Node,
    UndefinedResultVsAbortScenarioCaseEntity.Node
  ]);
  export type Type = NodeStaticType<typeof Node>;
}
