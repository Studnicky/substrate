/**
 * Paginator Lifecycle Hooks Unit Tests
 *
 * Verifies a subclass overriding onTransition/onEnterState/onExitState/
 * onTransitionRejected observes transitions with the correct from/to/event,
 * delegated from the internal PaginatorMachine to Paginator's own hooks.
 */

import { deepStrictEqual, ok, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import type { PaginatorEventType, PaginatorStateType } from '../../../src/index.js';

import { Paginator } from '../../../src/index.js';

interface TransitionRecord {
  from: string;
  to: string;
  event: string;
}

class TrackingPaginator extends Paginator<string, number> {
  readonly transitions: TransitionRecord[] = [];
  readonly enters: string[] = [];
  readonly exits: string[] = [];
  readonly rejections: { state: string; event: string; reason: string }[] = [];

  static tracked(): TrackingPaginator {
    return new TrackingPaginator();
  }

  protected override onTransition(
    from: PaginatorStateType<string, number>,
    to: PaginatorStateType<string, number>,
    event: PaginatorEventType<string, number>
  ): void {
    this.transitions.push({ 'event': event.type, 'from': from.variant, 'to': to.variant });
  }

  protected override onEnterState(state: PaginatorStateType<string, number>): void {
    this.enters.push(state.variant);
  }

  protected override onExitState(state: PaginatorStateType<string, number>): void {
    this.exits.push(state.variant);
  }

  protected override onTransitionRejected(
    state: PaginatorStateType<string, number>,
    event: PaginatorEventType<string, number>,
    reason: string
  ): void {
    this.rejections.push({ 'event': event.type, reason, 'state': state.variant });
  }
}

it('records idle -> hasMore on the first page with a cursor', () => {
  const paginator = TrackingPaginator.tracked();

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });

  deepStrictEqual(paginator.transitions[0], { 'event': 'pageReceived', 'from': 'idle', 'to': 'hasMore' });
  deepStrictEqual(paginator.exits, ['idle']);
  deepStrictEqual(paginator.enters, ['hasMore']);
});

it('does not fire onTransition/onEnterState/onExitState for hasMore -> hasMore', () => {
  const paginator = TrackingPaginator.tracked();

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });
  paginator.next('page-2', { 'cursor': 3, 'exhausted': false });

  strictEqual(paginator.transitions.length, 1);
  strictEqual(paginator.enters.length, 1);
  strictEqual(paginator.exits.length, 1);
});

it('records hasMore -> exhausted when nextCursor is undefined', () => {
  const paginator = TrackingPaginator.tracked();

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });
  paginator.next('page-2', { 'exhausted': true });

  const last = paginator.transitions.at(-1);

  deepStrictEqual(last, { 'event': 'pageReceived', 'from': 'hasMore', 'to': 'exhausted' });
});

it('records exhausted -> idle on reset', () => {
  const paginator = TrackingPaginator.tracked();

  paginator.next('page-1', { 'exhausted': true });
  paginator.reset();

  const last = paginator.transitions.at(-1);

  deepStrictEqual(last, { 'event': 'reset', 'from': 'exhausted', 'to': 'idle' });
});

it('fires onTransitionRejected when next() is called after exhaustion', () => {
  const paginator = TrackingPaginator.tracked();

  paginator.next('page-1', { 'exhausted': true });

  throws(() => { paginator.next('page-2', { 'exhausted': true }); });

  strictEqual(paginator.rejections.length, 1);
  strictEqual(paginator.rejections[0]?.state, 'exhausted');
  strictEqual(paginator.rejections[0]?.event, 'pageReceived');
  ok(paginator.rejections[0]?.reason.length > 0);
});
