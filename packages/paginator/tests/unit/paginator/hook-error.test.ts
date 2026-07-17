/**
 * Paginator Hook-Failure Unit Tests
 *
 * Verifies Paginator's HookInvoker-backed hook invocation: a throwing
 * override surfaces as a HookInvocationError instead of propagating raw or
 * being silently lost, and an unexpectedly-async override's rejection is
 * safely routed to the composed invoker's onHookError without ever
 * producing an unhandled promise rejection, even from Paginator's
 * synchronous, non-awaited call site (next()/reset()) — surfacing as a
 * HookInvocationError from the next call to next()/reset() once the
 * rejection has settled, since Paginator's own onHookError disposition
 * (record-then-rethrow-on-next-call) is no longer subclass-overridable
 * under composition.
 */

import { strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import type { PaginatorEventType, PaginatorStateType } from '../../../src/index.js';

import { Paginator } from '../../../src/index.js';

class ThrowingOnEnterPaginator extends Paginator<string, number> {
  static tracked(): ThrowingOnEnterPaginator {
    return new ThrowingOnEnterPaginator();
  }

  protected override onEnterState(_state: PaginatorStateType<string, number>): void {
    throw new Error('onEnterState boom');
  }
}

class AsyncOverridePaginator extends Paginator<string, number> {
  static tracked(): AsyncOverridePaginator {
    return new AsyncOverridePaginator();
  }

  protected override async onTransition(
    _from: PaginatorStateType<string, number>,
    _to: PaginatorStateType<string, number>,
    _event: PaginatorEventType<string, number>
  ): Promise<void> {
    throw new Error('onTransition async boom');
  }
}

it('surfaces a throwing hook override as a HookInvocationError, not the raw error', () => {
  const paginator = ThrowingOnEnterPaginator.tracked();

  throws(
    () => { paginator.next('page-1', { 'cursor': 2, 'exhausted': false }); },
    (err: unknown) => {
      strictEqual(err instanceof HookInvocationError, true);
      strictEqual((err as HookInvocationError).hookName, 'onEnterState');
      strictEqual((err as HookInvocationError).cause instanceof Error, true);
      strictEqual(((err as HookInvocationError).cause as Error).message, 'onEnterState boom');
      return true;
    }
  );
});

it(
  'routes an unexpectedly-async hook override\'s rejection to onHookError without producing an unhandled rejection, surfacing on the next call',
  async () => {
    const paginator = AsyncOverridePaginator.tracked();
    const rejectionEvents: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => {
      rejectionEvents.push(reason);
    };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      // Synchronous, non-awaited call site — mirrors next()'s own contract.
      // The override nonetheless violates that contract by being async, so
      // its rejection settles only after this call already returned.
      paginator.next('page-1', { 'cursor': 2, 'exhausted': false });

      // Give the microtask/macrotask queues a couple of turns so the
      // rejection settles and any (incorrect) unhandledRejection event
      // would have already fired.
      await new Promise((resolve) => { setImmediate(resolve); });
      await new Promise((resolve) => { setImmediate(resolve); });

      strictEqual(rejectionEvents.length, 0);

      // The failure was recorded once the rejection settled, clear of the
      // call that triggered it — it surfaces on the next transition attempt.
      throws(
        () => { paginator.next('page-2', { 'cursor': 3, 'exhausted': false }); },
        (err: unknown) => {
          strictEqual(err instanceof HookInvocationError, true);
          strictEqual((err as HookInvocationError).hookName, 'onTransition');
          strictEqual((err as HookInvocationError).cause instanceof Error, true);
          strictEqual(((err as HookInvocationError).cause as Error).message, 'onTransition async boom');
          return true;
        }
      );
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }
);
