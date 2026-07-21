/**
 * Paginator Reentrancy Regression Unit Tests
 *
 * Verifies next()/reset() commit correctly when a subclass hook override
 * reentrantly calls next()/reset() on the same instance, synchronously,
 * from inside onEnterState. Regression coverage for the ordering fix in
 * Paginator's constructor (early state commit inside the hook closures
 * plus #commitUnlessSuperseded) and for PaginatorHookInvoker's
 * detectReentrancy defense-in-depth layer.
 */

import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import type {
  PaginatorExhaustedStateInterface,
  PaginatorHasMoreStateInterface,
  PaginatorIdleStateEntity
} from '../../../src/index.js';

import { Paginator } from '../../../src/index.js';

/**
 * Reentrantly calls next('page-2', ...) from onEnterState the first time it
 * fires (idle -> hasMore). onEnterState does not fire again for the
 * subsequent hasMore -> hasMore transition the reentrant call itself
 * produces, so the `reentered` guard only needs to prevent the reentrant
 * call's own onEnterState invocation (there isn't one) from recursing —
 * kept anyway as a defensive guard against any future change to when
 * onEnterState fires.
 */
class ReentrantNextPaginator extends Paginator<string, number> {
  private reentered = false;

  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    if (this.reentered) {
      return;
    }
    this.reentered = true;
    this.next('page-2', { 'cursor': 3, 'exhausted': false });
  }
}

/**
 * Reentrantly calls reset() from onEnterState the first time it fires
 * (idle -> hasMore) — a variant-changing reentrant call, which fires a
 * second, nested pass of onExitState/onEnterState/onTransition on the same
 * `HookInvoker` instance while the outer onEnterState invocation is still
 * on the call stack.
 */
class ReentrantResetPaginator extends Paginator<string, number> {
  enterCount = 0;
  private reentered = false;

  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.enterCount++;

    if (this.reentered) {
      return;
    }
    this.reentered = true;
    this.reset();
  }
}

class CrossInstanceReentrantPaginator extends Paginator<string, number> {
  readonly enters: string[] = [];
  private name = 'unconfigured';
  private reentered = false;
  private target: CrossInstanceReentrantPaginator | undefined;

  configure(name: string, target?: CrossInstanceReentrantPaginator): void {
    this.name = name;
    this.target = target;
  }

  protected override onEnterState(
    state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    this.enters.push(`${this.name}:${state.variant}`);

    if (!this.reentered && this.target !== undefined) {
      this.reentered = true;
      this.target.next(`${this.name}-delegated-page`, { 'cursor': 2, 'exhausted': false });
    }
  }
}

it('does not lose a page when a hook override reentrantly calls next() with the same variant (hasMore -> hasMore)', () => {
  const paginator = ReentrantNextPaginator.create();

  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });

  // Both the outer call's page and the reentrant call's page must be
  // present, in receipt order — the outer frame's stale computed step
  // (built from the pre-reentrancy snapshot) must not clobber the
  // reentrant call's newer commit.
  deepStrictEqual(paginator.pages, ['page-1', 'page-2']);
  strictEqual(paginator.hasNext(), true);

  // Cursor state isn't publicly exposed and never drives Paginator's own
  // reducer (each next() call supplies its own cursor explicitly), so the
  // only observable proof of correct sequencing is that accumulation
  // continues correctly from here — a further next() call appends on top
  // of both prior pages rather than on top of a stale single-page state.
  paginator.next('page-3', { 'cursor': 4, 'exhausted': false });
  deepStrictEqual(paginator.pages, ['page-1', 'page-2', 'page-3']);
});

it('reentrant, variant-changing reset() from onEnterState resolves without throwing or corrupting state', () => {
  const paginator = ReentrantResetPaginator.create();

  // idle -> hasMore fires onEnterState, which reentrantly calls reset()
  // (hasMore -> idle) — a variant-changing reentrant call, which fires a
  // second, nested onExitState/onEnterState/onTransition pass on the same
  // `HookInvoker` instance while the outer onEnterState invocation is still
  // active on the call stack.
  paginator.next('page-1', { 'cursor': 2, 'exhausted': false });

  deepStrictEqual(paginator.pages, []);
  strictEqual(paginator.hasNext(), true);
  strictEqual(paginator.enterCount, 1, 'same-instance nested hook dispatch is stopped by reentrancy detection');
});

it('allows a hook to transition a second paginator because machine and reentrancy ownership are instance-local', () => {
  const target = CrossInstanceReentrantPaginator.create();
  const source = CrossInstanceReentrantPaginator.create();
  target.configure('target');
  source.configure('source', target);

  source.next('source-page', { 'cursor': 2, 'exhausted': false });

  deepStrictEqual(source.pages, ['source-page']);
  deepStrictEqual(target.pages, ['source-delegated-page']);
  deepStrictEqual(source.enters, ['source:hasMore']);
  deepStrictEqual(target.enters, ['target:hasMore']);
});
