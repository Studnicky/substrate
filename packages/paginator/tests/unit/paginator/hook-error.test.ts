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
 * rejection has settled, through Paginator's composed invoker disposition.
 */

import { deepStrictEqual, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { HookInvocationError } from '@studnicky/errors';

import type {
  PaginatorExhaustedStateInterface,
  PaginatorHasMoreStateInterface,
  PaginatorIdleStateEntity,
  PaginatorPageReceivedEventInterface,
  PaginatorResetEventEntity
} from '../../../src/index.js';

import { Paginator } from '../../../src/index.js';

class ThrowingOnEnterPaginator extends Paginator<string, number> {
  protected override onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>
  ): void {
    throw new Error('onEnterState boom');
  }
}

class AsyncOverridePaginator extends Paginator<string, number> {
  protected override async onTransition(
    _from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    _to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    _event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>
  ): Promise<void> {
    throw new Error('onTransition async boom');
  }
}

class AsyncOwnedPaginator extends Paginator<string, number> {
  readonly failureDetails = { 'labels': ['initial'] };
  failure = new Error('unconfigured transition failure');
  readonly transitions: string[] = [];
  private name = 'unconfigured';
  private rejectNextTransition = false;

  configure(name: string, rejectNextTransition: boolean): void {
    this.name = name;
    this.failure = new Error(`${name} transition boom`, { 'cause': this.failureDetails });
    this.rejectNextTransition = rejectNextTransition;
  }

  diagnostics(): readonly HookInvocationError[] {
    return this.hooks.getHookErrors();
  }

  protected override async onTransition(
    _from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<string, number>
    | PaginatorExhaustedStateInterface<string>,
    _event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<string, number>
  ): Promise<void> {
    this.transitions.push(`${this.name}:${to.variant}`);

    if (this.rejectNextTransition) {
      this.rejectNextTransition = false;
      await Promise.resolve();
      throw this.failure;
    }
  }
}

it('surfaces a throwing hook override as a HookInvocationError, not the raw error', () => {
  const paginator = ThrowingOnEnterPaginator.create();

  throws(
    () => { paginator.next('page-1', { 'cursor': 2, 'exhausted': false }); },
    (err: unknown) => {
      if (!(err instanceof HookInvocationError) || !(err.cause instanceof Error)) {
        return false;
      }
      strictEqual(err.hookName, 'onEnterState');
      strictEqual(err.cause.message, 'onEnterState boom');
      return true;
    }
  );
});

it(
  'routes an unexpectedly-async hook override\'s rejection to onHookError without producing an unhandled rejection, surfacing on the next call',
  async () => {
    const paginator = AsyncOverridePaginator.create();
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
          if (!(err instanceof HookInvocationError) || !(err.cause instanceof Error)) {
            return false;
          }
          strictEqual(err.hookName, 'onTransition');
          strictEqual(err.cause.message, 'onTransition async boom');
          return true;
        }
      );
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  }
);

it('keeps asynchronously recorded hook failures isolated to their owning paginator instance', async () => {
  const failing = AsyncOwnedPaginator.create();
  const healthy = AsyncOwnedPaginator.create();
  failing.configure('failing', true);
  healthy.configure('healthy', false);
  const rejectionEvents: unknown[] = [];
  const onUnhandledRejection = (reason: unknown): void => {
    rejectionEvents.push(reason);
  };
  process.on('unhandledRejection', onUnhandledRejection);

  try {
    failing.next('failing-page-1', { 'cursor': 2, 'exhausted': false });
    healthy.next('healthy-page-1', { 'cursor': 2, 'exhausted': false });

    await new Promise((resolve) => { setImmediate(resolve); });
    await new Promise((resolve) => { setImmediate(resolve); });

    strictEqual(rejectionEvents.length, 0);
    healthy.next('healthy-page-2', { 'cursor': 3, 'exhausted': false });
    deepStrictEqual(healthy.pages, ['healthy-page-1', 'healthy-page-2']);

    throws(
      () => { failing.next('failing-page-2', { 'cursor': 3, 'exhausted': false }); },
      (err: unknown) => {
        if (!(err instanceof HookInvocationError)) {
          return false;
        }
        strictEqual(err.hookName, 'onTransition');
        strictEqual(err.cause, failing.failure);
        err.message = 'mutated propagated wrapper';
        failing.failure.message = 'mutated original cause';
        failing.failureDetails.labels.push('propagated mutation');
        return true;
      }
    );

    const firstDiagnostics = failing.diagnostics();
    strictEqual(firstDiagnostics.length, 1);
    const firstCause = firstDiagnostics[0]?.cause;
    if (!(firstCause instanceof Error)) {
      throw new Error('Expected retained diagnostic cause');
    }
    strictEqual(firstCause.message, 'failing transition boom');
    const firstDetails = firstCause.cause;
    if (firstDetails === null || typeof firstDetails !== 'object') {
      throw new Error('Expected retained diagnostic details');
    }
    const firstLabels: unknown = Reflect.get(firstDetails, 'labels');
    deepStrictEqual(firstLabels, ['initial']);
    if (!Array.isArray(firstLabels)) {
      throw new Error('Expected retained diagnostic labels');
    }
    firstLabels.push('returned mutation');

    const secondCause = failing.diagnostics()[0]?.cause;
    if (!(secondCause instanceof Error)) {
      throw new Error('Expected second diagnostic cause');
    }
    const secondDetails = secondCause.cause;
    if (secondDetails === null || typeof secondDetails !== 'object') {
      throw new Error('Expected second diagnostic details');
    }
    deepStrictEqual(Reflect.get(secondDetails, 'labels'), ['initial']);

    deepStrictEqual(failing.pages, ['failing-page-1', 'failing-page-2']);
    deepStrictEqual(failing.transitions, ['failing:hasMore']);
    deepStrictEqual(healthy.transitions, ['healthy:hasMore']);
  } finally {
    process.off('unhandledRejection', onUnhandledRejection);
  }
});
