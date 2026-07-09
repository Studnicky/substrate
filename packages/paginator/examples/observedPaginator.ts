/** observedPaginator — override onTransition to collect a transition trace. Run: npx tsx examples/observedPaginator.ts */

import assert from 'node:assert/strict';

// #region usage
import type { PaginatorEventType, PaginatorStateType } from '../src/index.js';

import { Paginator } from '../src/index.js';

type TransitionRecord = {
  'event': string;
  'from': string;
  'to': string;
};

class TelemetryPaginator<TPage, TCursor> extends Paginator<TPage, TCursor> {
  readonly transitions: TransitionRecord[] = [];

  static tracked<TPage, TCursor>(): TelemetryPaginator<TPage, TCursor> {
    return new TelemetryPaginator<TPage, TCursor>();
  }

  protected override onTransition(
    from: PaginatorStateType<TPage, TCursor>,
    to: PaginatorStateType<TPage, TCursor>,
    event: PaginatorEventType<TPage, TCursor>
  ): void {
    console.log(`[paginator] ${from.variant} --${event.type}--> ${to.variant}`);
    this.transitions.push({ 'event': event.type, 'from': from.variant, 'to': to.variant });
  }

  protected override onEnterState(state: PaginatorStateType<TPage, TCursor>): void {
    console.log(`[paginator] entered ${state.variant}`);
  }

  protected override onExitState(state: PaginatorStateType<TPage, TCursor>): void {
    console.log(`[paginator] exited ${state.variant}`);
  }
}

const paginator = TelemetryPaginator.tracked<string, number>();

// idle -> hasMore
paginator.next('page-1', 2);
// hasMore -> hasMore (no transition hooks fire — same variant)
paginator.next('page-2', 3);
// hasMore -> exhausted
paginator.next('page-3', undefined);
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
