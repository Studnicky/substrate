/** observedPaginator — override onTransition to collect a transition trace. Run: npx tsx examples/observedPaginator.ts */

import assert from 'node:assert/strict';

// #region usage
import type {
  PaginatorExhaustedStateInterface,
  PaginatorHasMoreStateInterface,
  PaginatorIdleStateEntity,
  PaginatorPageReceivedEventInterface,
  PaginatorResetEventEntity
} from '../src/index.js';
import type { TransitionRecordEntity } from './entities/TransitionRecordEntity.js';

import { Paginator } from '../src/index.js';

class TelemetryPaginator<TPage, TCursor> extends Paginator<TPage, TCursor> {
  readonly transitions: TransitionRecordEntity.Type[] = [];

  protected override onTransition(
    from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>
  ): void {
    console.log(`[paginator] ${from.variant} --${event.type}--> ${to.variant}`);
    this.transitions.push({ 'event': event.type, 'from': from.variant, 'to': to.variant });
  }

  protected override onEnterState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>
  ): void {
    console.log(`[paginator] entered ${state.variant}`);
  }

  protected override onExitState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>
  ): void {
    console.log(`[paginator] exited ${state.variant}`);
  }
}

const paginator = TelemetryPaginator.create();

// idle -> hasMore
paginator.next('page-1', { 'cursor': 2, 'exhausted': false });
// hasMore -> hasMore (no transition hooks fire — same variant)
paginator.next('page-2', { 'cursor': 3, 'exhausted': false });
// hasMore -> exhausted
paginator.next('page-3', { 'exhausted': true });
// exhausted -> idle
paginator.reset();

console.log('Pages:', paginator.pages);
console.log('Transitions:', paginator.transitions);
// #endregion usage

assert.equal(paginator.hasNext(), true);
assert.deepEqual(paginator.pages, []);

assert.equal(paginator.transitions.length, 3);
assert.deepEqual(paginator.transitions[0], { 'event': 'pageReceived', 'from': 'idle', 'to': 'hasMore' });
assert.deepEqual(paginator.transitions[1], { 'event': 'pageReceived', 'from': 'hasMore', 'to': 'exhausted' });
assert.deepEqual(paginator.transitions[2], { 'event': 'reset', 'from': 'exhausted', 'to': 'idle' });

console.log('observedPaginator: all assertions passed');
