import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { TIMING_STATUS } from '../constants/index.js';

/** Canonical status suffix accepted by timing events. */
export namespace TimingStatusEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'enum': [
      TIMING_STATUS.ABORT,
      TIMING_STATUS.ACQUIRED,
      TIMING_STATUS.COMPLETE,
      TIMING_STATUS.DEQUEUED,
      TIMING_STATUS.ERROR,
      TIMING_STATUS.HIT,
      TIMING_STATUS.MISS,
      TIMING_STATUS.QUEUED,
      TIMING_STATUS.RELEASED,
      TIMING_STATUS.START,
      TIMING_STATUS.TIMEOUT,
      TIMING_STATUS.WAITING
    ],
    'type': 'string'
  } as const;

  export const Node = SchemaNode.defineEnum({}, [
    TIMING_STATUS.ABORT,
    TIMING_STATUS.ACQUIRED,
    TIMING_STATUS.COMPLETE,
    TIMING_STATUS.DEQUEUED,
    TIMING_STATUS.ERROR,
    TIMING_STATUS.HIT,
    TIMING_STATUS.MISS,
    TIMING_STATUS.QUEUED,
    TIMING_STATUS.RELEASED,
    TIMING_STATUS.START,
    TIMING_STATUS.TIMEOUT,
    TIMING_STATUS.WAITING
  ] as const);
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
