/**
 * Paginator Lifecycle Hooks Unit Tests
 *
 * Verifies a subclass overriding onTransition/onEnterState/onExitState/
 * onTransitionRejected observes transitions with the correct from/to/event,
 * delegated from the internal PaginatorMachine to Paginator's own hooks.
 */

import { deepStrictEqual, ok, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import type {
  PaginatorExhaustedStateInterface,
  PaginatorHasMoreStateInterface,
  PaginatorIdleStateEntity,
  PaginatorPageReceivedEventInterface,
  PaginatorResetEventEntity
} from '../../../src/index.js';

import { Paginator } from '../../../src/index.js';

interface TransitionRecord {
  from: string;
  to: string;
  event: string;
}

interface ObjectCursor {
  token: {
    value: string;
  };
}

class TrackingPaginator extends Paginator<string, number> {
  readonly transitions: TransitionRecord[] = [];
  readonly enters: string[] = [];
  readonly exits: string[] = [];
  readonly order: string[] = [];
  readonly rejections: { state: string; event: string; reason: string }[] = [];

  protected override onTransition(
    from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>
  ): void {
    this.transitions.push({ 'event': event.type, 'from': from.variant, 'to': to.variant });
    this.order.push(`transition:${from.variant}->${to.variant}`);
  }

  protected override onEnterState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.enters.push(state.variant);
    this.order.push(`enter:${state.variant}`);
  }

  protected override onExitState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.exits.push(state.variant);
    this.order.push(`exit:${state.variant}`);
  }

  protected override onTransitionRejected(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>,
    reason: string
  ): void {
    this.rejections.push({ 'event': event.type, reason, 'state': state.variant });
    this.order.push(`rejected:${state.variant}:${event.type}`);
  }
}

class CursorSnapshotPaginator extends Paginator<string, ObjectCursor> {
  readonly exitedCursorValues: string[] = [];

  protected override onExitState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, ObjectCursor>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    if (state.variant === 'hasMore') {
      this.exitedCursorValues.push(state.cursor.token.value);
    }
  }
}

it('records idle -> hasMore on the first page with a cursor', () => {
  const paginator = TrackingPaginator.create();

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });

  deepStrictEqual(paginator.transitions[0], { 'event': 'pageReceived', 'from': 'idle', 'to': 'hasMore' });
  deepStrictEqual(paginator.exits, ['idle']);
  deepStrictEqual(paginator.enters, ['hasMore']);
  deepStrictEqual(paginator.order, ['exit:idle', 'transition:idle->hasMore', 'enter:hasMore']);
});

it('does not fire onTransition/onEnterState/onExitState for hasMore -> hasMore', () => {
  const paginator = TrackingPaginator.create();

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });
  paginator.next('page-2', { 'cursor': 3, 'exhausted': false });

  strictEqual(paginator.transitions.length, 1);
  strictEqual(paginator.enters.length, 1);
  strictEqual(paginator.exits.length, 1);
});

it('records hasMore -> exhausted when the cursor signals exhaustion', () => {
  const paginator = TrackingPaginator.create();

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });
  paginator.next('page-2', { 'exhausted': true });

  const last = paginator.transitions.at(-1);

  deepStrictEqual(last, { 'event': 'pageReceived', 'from': 'hasMore', 'to': 'exhausted' });
});

it('records exhausted -> idle on reset', () => {
  const paginator = TrackingPaginator.create();

  paginator.next('page-1', { 'exhausted': true });
  paginator.reset();

  const last = paginator.transitions.at(-1);

  deepStrictEqual(last, { 'event': 'reset', 'from': 'exhausted', 'to': 'idle' });
});

it('fires onTransitionRejected when next() is called after exhaustion', () => {
  const paginator = TrackingPaginator.create();

  paginator.next('page-1', { 'exhausted': true });

  throws(() => { paginator.next('page-2', { 'exhausted': true }); });

  strictEqual(paginator.rejections.length, 1);
  strictEqual(paginator.rejections[0]?.state, 'exhausted');
  strictEqual(paginator.rejections[0]?.event, 'pageReceived');
  ok(paginator.rejections[0]?.reason.length > 0);
});

it('retains an object cursor snapshot detached from caller mutations', () => {
  const paginator = CursorSnapshotPaginator.create();
  const cursor: ObjectCursor = { 'token': { 'value': 'original' } };

  paginator.next('page-1', { cursor, 'exhausted': false });
  cursor.token.value = 'mutated';
  paginator.reset();

  deepStrictEqual(paginator.exitedCursorValues, ['original']);
});
