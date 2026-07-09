import type { FsmStepType } from '@studnicky/fsm';

import { StateMachine, TransitionRejectedError } from '@studnicky/fsm';

import type { PaginatorEventType } from './types/PaginatorEventType.js';
import type { PaginatorStateType } from './types/PaginatorStateType.js';

/**
 * Internal reducer for `Paginator`. Pure state transitions with no side
 * effects — `idle` → `hasMore` → `exhausted`, with `reset` returning to
 * `idle` from any state. Not exported from the package barrel; consumers
 * only ever see `Paginator` and its state/event types.
 */
export abstract class PaginatorMachine<TPage, TCursor> extends StateMachine<
  PaginatorStateType<TPage, TCursor>,
  PaginatorEventType<TPage, TCursor>,
  never
> {
  protected constructor() {
    super();
  }

  override getInitialState(): PaginatorStateType<TPage, TCursor> {
    return { 'variant': 'idle' };
  }

  override reduce(
    state: PaginatorStateType<TPage, TCursor>,
    event: PaginatorEventType<TPage, TCursor>
  ): FsmStepType<PaginatorStateType<TPage, TCursor>, never> {
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
    return { 'effects': [], 'state': state };
  }

  private receivePage(
    priorPages: readonly TPage[],
    event: { readonly 'nextCursor': TCursor | undefined; readonly 'page': TPage; readonly 'type': 'pageReceived'; }
  ): PaginatorStateType<TPage, TCursor> {
    const pages = [...priorPages, event.page];

    return event.nextCursor === undefined
      ? { 'pages': pages, 'variant': 'exhausted' }
      : { 'cursor': event.nextCursor, 'pages': pages, 'variant': 'hasMore' };
  }
}
