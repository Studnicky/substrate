import type { HookInvocationError } from '@studnicky/errors/node';

import type { PaginatorIdleStateEntity } from '../entities/PaginatorIdleStateEntity.js';
import type { PaginatorResetEventEntity } from '../entities/PaginatorResetEventEntity.js';
import type { PaginatorExhaustedStateInterface } from './PaginatorExhaustedStateInterface.js';
import type { PaginatorHasMoreStateInterface } from './PaginatorHasMoreStateInterface.js';
import type { PaginatorPageReceivedEventInterface } from './PaginatorPageReceivedEventInterface.js';

/** Internal surface a `Paginator` exposes to its owned machine and hook invoker. */
export interface PaginatorOwnerInterface<TPage, TCursor> {
  commitState(
    state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>
  ): void;
  reportEnterState(
    state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>
  ): unknown;
  reportExitState(
    state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>
  ): unknown;
  reportTransition(
    from: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>,
    nextState: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>
  ): unknown;
  reportTransitionRejected(
    state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>,
    reason: string
  ): unknown;
  stageHookFailure(failure: HookInvocationError): void;
}
