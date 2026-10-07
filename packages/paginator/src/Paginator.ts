
import type { HookInvoker} from '#runtime';

import { HookInvocationError, Predicates, RuntimeError } from '#runtime';

import type { PaginatorExhaustedCursorEntity } from './entities/PaginatorExhaustedCursorEntity.js';
import type { PaginatorIdleStateEntity } from './entities/PaginatorIdleStateEntity.js';
import type { PaginatorResetEventEntity } from './entities/PaginatorResetEventEntity.js';
import type { PaginatorAvailableCursorInterface } from './interfaces/PaginatorAvailableCursorInterface.js';
import type { PaginatorExhaustedStateInterface } from './interfaces/PaginatorExhaustedStateInterface.js';
import type { PaginatorHasMoreStateInterface } from './interfaces/PaginatorHasMoreStateInterface.js';
import type { PaginatorPageReceivedEventInterface } from './interfaces/PaginatorPageReceivedEventInterface.js';

import { PaginatorCloneError } from './errors/index.js';
import { PaginatorOwnedHookInvoker } from './PaginatorOwnedHookInvoker.js';
import { PaginatorOwnedMachine } from './PaginatorOwnedMachine.js';

/** Constructor shape `Paginator.create()` accepts as its receiver. */
interface PaginatorConstructorInterface<TInstance> {
  readonly 'prototype': TInstance;
}

/**
 * Tracks cursor/page-list state for a paginated data source. Does not fetch
 * data — the caller supplies fetched pages via `next()`; this primitive only
 * tracks what pages have been received, the cursor for the next page, and
 * whether more pages are expected.
 *
 * Composes an owned internal `@studnicky/fsm` `StateMachine` rather than
 * extending it. The private machine holds a readonly reference to its
 * `Paginator` owner and routes lifecycle fire points directly through that
 * owner's `HookInvoker`, so each instance retains independent state, hook
 * reentrancy detection, and failure ownership.
 *
 * The owned hook invoker stages a transient propagation error rather than
 * throwing it at the machine boundary. `next()` and `reset()` rethrow the
 * staged error once `machine.transition()` returns, because a synchronous
 * throw from the invoker would not reach that call site. The owned machine
 * forwards to these hooks from inside `PaginatorMachine`'s own
 * `StateMachine.transition()`, which wraps that call in the fsm package's
 * hook invoker. That invoker intentionally swallows failures so a broken
 * observer cannot revert an already-computed transition step. Staging the
 * error and rethrowing it after control returns past that boundary makes a
 * broken hook surface as a `HookInvocationError`.
 *
 * `next()` and `reset()` commit `this.state` from the owned machine's
 * `onTransition` and `onEnterState` fire points before invoking the consumer's
 * override. A hook override may call `next()` or `reset()` again, synchronously,
 * on the same `Paginator` — for example to auto-fetch the next page from
 * `onEnterState`. Committing early means that reentrant call reads the state
 * this call already produced. Once `machine.transition()` returns,
 * `#commitUnlessSuperseded` applies this call's computed state only if nothing
 * has moved `this.state` since. The owned hook invoker's `detectReentrancy`
 * option is a second, independent layer: it throws `ReentrantHookInvocationError`
 * for a reentrant call that triggers a further nested hook invocation.
 */
export class Paginator<TPage, TCursor> {
  private readonly machine: PaginatorOwnedMachine<TPage, TCursor>;

  private state: PaginatorExhaustedStateInterface<TPage>
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorIdleStateEntity.Type;

  protected readonly hooks: HookInvoker;

  #pendingHookPropagation: HookInvocationError | null = null;

  protected constructor() {
    this.hooks = new PaginatorOwnedHookInvoker<TPage, TCursor>();
    this.machine = new PaginatorOwnedMachine<TPage, TCursor>(this.hooks);
    this.state = this.machine.getInitialState();
  }

  public static create<
    TPage,
    TCursor,
    TInstance extends Paginator<TPage, TCursor> = Paginator<TPage, TCursor>
  >(this: PaginatorConstructorInterface<TInstance>): TInstance {
    if (!Predicates.isFunction(this)) {
      throw RuntimeError.create('Paginator.create() requires a constructor');
    }
    const result: unknown = Reflect.construct(this, []);

    if (Predicates.isInstanceOf(result, this)) {
      result.hooks.attachOwner(result);
      result.machine.attachOwner(result);

      return result;
    }
    throw RuntimeError.create('Paginator.create() must construct a Paginator instance');
  }

  /** `true` unless the source is known to be exhausted — true for both `idle` and `hasMore`. */
  public hasNext(): boolean {
    const result = this.state.variant !== 'exhausted';

    return result;
  }

  /** All pages received so far, in receipt order. Empty before the first page arrives. */
  public get pages(): readonly TPage[] {
    let result: readonly TPage[] = [];

    if (this.state.variant === 'hasMore' || this.state.variant === 'exhausted') {
      result = Paginator.cloneValue(this.state.pages);
    }

    return result;
  }

  /**
   * Records a fetched page. The cursor argument is a discriminated union
   * rather than a bare cursor value, so a cursor type that includes
   * undefined stays distinguishable from exhaustion. Passing an exhausted
   * marker sets the source exhausted. Passing an available cursor moves to
   * or stays in the has-more state with that cursor. Throws if called after
   * the source is already exhausted.
   */
  public next(
    page: TPage,
    nextCursor: PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type
  ): void {
    const priorState = this.state;
    const retainedPage = Paginator.cloneValue(page);
    const retainedCursor = Paginator.cloneValue(nextCursor);
    const step = this.machine.transition(priorState, {
      'nextCursor': retainedCursor,
      'page': retainedPage,
      'type': 'pageReceived'
    });

    this.#commitUnlessSuperseded(priorState, step.state);
    this.#throwPendingHookPropagation();
  }

  /** Returns to the initial `idle` state, discarding all received pages and the cursor. */
  public reset(): void {
    const priorState = this.state;
    const step = this.machine.transition(priorState, { 'type': 'reset' });

    this.#commitUnlessSuperseded(priorState, step.state);
    this.#throwPendingHookPropagation();
  }

  /** @internal Commits a state the owned machine has computed. */
  public commitState(
    state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>
  ): void {
    this.state = state;
  }

  /** @internal Forwards a transition to the consumer-overridable hook. */
  public reportTransition(
    from: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>,
    nextState: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>
  ): unknown {
    const result = this.onTransition(from, nextState, event);

    return result;
  }

  /** @internal Forwards a state entry to the consumer-overridable hook. */
  public reportEnterState(
    state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>
  ): unknown {
    const result = this.onEnterState(state);

    return result;
  }

  /** @internal Forwards a state exit to the consumer-overridable hook. */
  public reportExitState(
    state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>
  ): unknown {
    const result = this.onExitState(state);

    return result;
  }

  /** @internal Forwards a rejected transition to the consumer-overridable hook. */
  public reportTransitionRejected(
    state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>,
    event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>,
    reason: string
  ): unknown {
    const result = this.onTransitionRejected(state, event, reason);

    return result;
  }

  /** @internal Holds a hook failure until the in-flight transition completes. */
  public stageHookFailure(failure: HookInvocationError): void {
    this.#pendingHookPropagation = failure;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override in a subclass to observe
  // transitions without coupling this class to any logging/metrics library.
  // ---------------------------------------------------------------------------

  protected onTransition(
    _from: PaginatorExhaustedStateInterface<TPage>
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorIdleStateEntity.Type,
    _nextState: PaginatorExhaustedStateInterface<TPage>
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorIdleStateEntity.Type,
    _event: PaginatorPageReceivedEventInterface<TPage, TCursor> | PaginatorResetEventEntity.Type
  ): void {}

  protected onEnterState(_state: PaginatorExhaustedStateInterface<TPage>
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorIdleStateEntity.Type): void {}

  protected onExitState(_state: PaginatorExhaustedStateInterface<TPage>
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorIdleStateEntity.Type): void {}

  protected onTransitionRejected(
    _state: PaginatorExhaustedStateInterface<TPage>
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorIdleStateEntity.Type,
    _event: PaginatorPageReceivedEventInterface<TPage, TCursor> | PaginatorResetEventEntity.Type,
    _reason: string
  ): void {}

  private static cloneValue<T>(value: T): T {
    try {
      const cloned: T = structuredClone(value);

      return cloned;
    } catch (cause) {
      throw new PaginatorCloneError('Paginator cannot retain a value that is not structured-cloneable', cause);
    }
  }

  /**
   * Commits `computedState` unless `this.state` has already moved past
   * `priorState`. That happens only when a hook fired during this same
   * `transition()` call reentrantly called `next()` or `reset()`, and the
   * reentrant call already committed a state built on top of this call's
   * early commit. In that case `computedState` is stale and committing it
   * would discard the newer state.
   */
  #commitUnlessSuperseded(
    priorState: PaginatorExhaustedStateInterface<TPage>
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorIdleStateEntity.Type,
    computedState: PaginatorExhaustedStateInterface<TPage>
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorIdleStateEntity.Type
  ): void {
    if (this.state === priorState) {
      this.state = computedState;
    }
  }

  /** Clears and throws a hook failure staged for propagation during a completed transition, if any. */
  #throwPendingHookPropagation(): void {
    const failure = this.#pendingHookPropagation;

    if (failure instanceof HookInvocationError) {
      this.#pendingHookPropagation = null;
      throw failure;
    }
  }
}
