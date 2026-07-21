import type { FsmStepInterface } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { PaginatorIdleStateEntity } from './entities/PaginatorIdleStateEntity.js';
import type { PaginatorResetEventEntity } from './entities/PaginatorResetEventEntity.js';
import type { PaginatorExhaustedStateInterface } from './interfaces/PaginatorExhaustedStateInterface.js';
import type { PaginatorHasMoreStateInterface } from './interfaces/PaginatorHasMoreStateInterface.js';
import type { PaginatorPageReceivedEventInterface } from './interfaces/PaginatorPageReceivedEventInterface.js';

/**
 * Internal reducer for `Paginator`. Pure state transitions with no side
 * effects — `idle` → `hasMore` → `exhausted`, with `reset` returning to
 * `idle` from any state. Not exported from the package barrel; consumers
 * only ever see `Paginator` and its variant contracts.
 */
export abstract class PaginatorMachine<TPage, TCursor> extends StateMachine<
  PaginatorIdleStateEntity.Type
  | PaginatorHasMoreStateInterface<TPage, TCursor>
  | PaginatorExhaustedStateInterface<TPage>,
  PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>,
  never
> {
  protected constructor() {
    super();
  }

  override getInitialState(): PaginatorIdleStateEntity.Type
  | PaginatorHasMoreStateInterface<TPage, TCursor>
  | PaginatorExhaustedStateInterface<TPage> {
    return { 'variant': 'idle' };
  }

  override reduce(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>
  ): FsmStepInterface<
    PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    never
  > {
    if (event.type === 'reset') {
      return { 'effects': [], 'state': { 'variant': 'idle' } };
    }

    switch (state.variant) {
      case 'hasMore':
        return { 'effects': [], 'state': this.receivePage(state.pages, event) };
      case 'idle':
        return { 'effects': [], 'state': this.receivePage([], event) };
      case 'exhausted':
        throw new TransitionRejectedError({
          'eventType': event.type,
          'reason': 'Paginator is exhausted: no more pages can be received after exhaustion',
          'stateVariant': state.variant
        });
    }

    throw new Error(`Unhandled paginator state variant: ${JSON.stringify(state)}`);
  }

  private receivePage(
    priorPages: TPage[],
    event: PaginatorPageReceivedEventInterface<TPage, TCursor>
  ): PaginatorIdleStateEntity.Type
  | PaginatorHasMoreStateInterface<TPage, TCursor>
  | PaginatorExhaustedStateInterface<TPage> {
    priorPages.push(event.page);

    return event.nextCursor.exhausted
      ? { 'pages': priorPages, 'variant': 'exhausted' }
      : { 'cursor': event.nextCursor.cursor, 'pages': priorPages, 'variant': 'hasMore' };
  }
}
