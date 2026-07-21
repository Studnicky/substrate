import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { PaginatorExhaustedCursorEntity } from './entities/PaginatorExhaustedCursorEntity.js';
import type { PaginatorIdleStateEntity } from './entities/PaginatorIdleStateEntity.js';
import type { PaginatorResetEventEntity } from './entities/PaginatorResetEventEntity.js';
import type { PaginatorAvailableCursorInterface } from './interfaces/PaginatorAvailableCursorInterface.js';
import type { PaginatorExhaustedStateInterface } from './interfaces/PaginatorExhaustedStateInterface.js';
import type { PaginatorHasMoreStateInterface } from './interfaces/PaginatorHasMoreStateInterface.js';
import type { PaginatorPageReceivedEventInterface } from './interfaces/PaginatorPageReceivedEventInterface.js';

import { PaginatorMachine } from './PaginatorMachine.js';

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
 * The owned hook invoker retains one detached diagnostic and stages a transient
 * propagation error rather than throwing it at the machine boundary. `next()`/`reset()` rethrow the staged error once
 * `machine.transition()` returns because a synchronous throw from the
 * invoker would not reach that call site. The owned machine forwards to these hooks from *inside*
 * `PaginatorMachine`'s own `StateMachine.transition()`, which wraps that same
 * call in the fsm package's own hook invoker — one that intentionally
 * swallows failures so a broken observer can never revert an
 * already-computed transition step. Throwing from the owned hook invoker
 * would be caught by that outer safety net before reaching `next()`/`reset()`'s
 * caller. Staging the propagation error and rethrowing it once control returns past
 * that boundary is what makes a broken hook surface as a `HookInvocationError`
 * instead of vanishing into fsm's transition-integrity net.
 *
 * `next()`/`reset()` commit `this.state` from the owned machine's
 * `onTransition`/`onEnterState` fire points before invoking the consumer's
 * override rather than only after `machine.transition()` returns. This matters
 * because a hook override is free to call `next()`/`reset()` again,
 * synchronously, on this same `Paginator` — a plausible "auto-fetch the next
 * page from `onEnterState`" pattern. Committing early means that reentrant
 * call reads the state this call already produced, not the stale state this
 * call started from, so it correctly builds its own page on top. Once
 * `machine.transition()` returns to `next()`/`reset()`, `#commitUnlessSuperseded`
 * only applies this call's own (by-then possibly stale) computed state if
 * nothing else has moved `this.state` since — otherwise the reentrant call's
 * newer commit already stands and must not be overwritten. The owned hook
 * invoker's `detectReentrancy` option is a second, independent
 * layer on top of this: it throws `ReentrantHookInvocationError` immediately
 * for a reentrant call that itself triggers a further nested hook
 * invocation on this same `HookInvoker` instance, for cases the commit
 * ordering above does not anticipate.
 */
export class Paginator<TPage, TCursor> {
  private static isConstructed<
    TPage,
    TCursor,
    TInstance extends Paginator<TPage, TCursor>
  >(
    value: unknown,
    constructor: Function & { readonly 'prototype': TInstance }
  ): value is TInstance {
    return value instanceof constructor;
  }

  private static readonly OwnedHookInvoker = class PaginatorOwnedHookInvoker<TPage, TCursor> extends HookInvoker {
    constructor(private readonly owner: Paginator<TPage, TCursor>) {
      super({ 'detectReentrancy': true });
    }

    protected override onHookError(hookName: string, cause: unknown): void {
      const failure = cause instanceof HookInvocationError
        ? cause
        : new HookInvocationError(hookName, cause);
      this.owner.#pendingHookPropagation = failure;
    }
  };

  private static readonly OwnedMachine = class PaginatorOwnedMachine<TPage, TCursor> extends PaginatorMachine<TPage, TCursor> {
    constructor(private readonly owner: Paginator<TPage, TCursor>) {
      super();
    }

    protected override onTransition(
      from: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>,
      to: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>,
      event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>
    ): void {
      super.onTransition(from, to, event);
      this.owner.hooks.invoke('onTransition', () => {
        this.owner.state = to;
        const result = this.owner.onTransition(from, to, event);
        return result;
      });
    }

    protected override onEnterState(
      state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>
    ): void {
      super.onEnterState(state);
      this.owner.hooks.invoke('onEnterState', () => {
        this.owner.state = state;
        const result = this.owner.onEnterState(state);
        return result;
      });
    }

    protected override onExitState(
      state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>
    ): void {
      super.onExitState(state);
      this.owner.hooks.invoke('onExitState', () => {
        const result = this.owner.onExitState(state);
        return result;
      });
    }

    protected override onTransitionRejected(
      state: PaginatorIdleStateEntity.Type
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorExhaustedStateInterface<TPage>,
      event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>,
      reason: string
    ): void {
      super.onTransitionRejected(state, event, reason);
      this.owner.hooks.invoke('onTransitionRejected', () => {
        const result = this.owner.onTransitionRejected(state, event, reason);
        return result;
      });
    }
  };

  private readonly machine: PaginatorMachine<TPage, TCursor>;
  private state: PaginatorIdleStateEntity.Type
  | PaginatorHasMoreStateInterface<TPage, TCursor>
  | PaginatorExhaustedStateInterface<TPage>;
  protected readonly hooks: HookInvoker;
  #pendingHookPropagation: HookInvocationError | undefined;

  protected constructor() {
    this.hooks = new Paginator.OwnedHookInvoker<TPage, TCursor>(this);
    this.machine = new Paginator.OwnedMachine<TPage, TCursor>(this);
    this.state = this.machine.getInitialState();
  }

  static create<
    TPage,
    TCursor,
    TInstance extends Paginator<TPage, TCursor> = Paginator<TPage, TCursor>
  >(
    this: Function & { readonly 'prototype': TInstance }
  ): TInstance {
    const result: unknown = Reflect.construct(this, []);
    if (!Paginator.isConstructed(result, this)) {
      throw new TypeError('Paginator.create() must construct a Paginator instance');
    }
    return result;
  }

  /** `true` unless the source is known to be exhausted — true for both `idle` and `hasMore`. */
  hasNext(): boolean {
    return this.state.variant !== 'exhausted';
  }

  /** All pages received so far, in receipt order. Empty before the first page arrives. */
  get pages(): readonly TPage[] {
    return this.state.variant === 'idle' ? [] : structuredClone(this.state.pages);
  }

  /**
   * Records a fetched page. `nextCursor` is a discriminated union rather than
   * `TCursor | undefined`: for `TCursor` types whose value space includes
   * `undefined` as a legitimate cursor (e.g. `Paginator<TPage, string |
   * undefined>`), a bare `undefined` cannot double as both "here is the next
   * cursor" and "the source is exhausted" without losing information. Passing
   * `{ 'exhausted': true }` marks the source exhausted; `{ 'cursor': TCursor,
   * 'exhausted': false }` transitions to (or stays in) `hasMore` with that
   * cursor, whatever its value. Throws if called after the source is already
   * exhausted.
   */
  next(
    page: TPage,
    nextCursor: PaginatorAvailableCursorInterface<TCursor> | PaginatorExhaustedCursorEntity.Type
  ): void {
    const priorState = this.state;
    const retainedPage = structuredClone(page);
    const retainedCursor = structuredClone(nextCursor);
    const step = this.machine.transition(priorState, {
      'nextCursor': retainedCursor,
      'page': retainedPage,
      'type': 'pageReceived'
    });

    this.#commitUnlessSuperseded(priorState, step.state);
    this.#throwPendingHookPropagation();
  }

  /** Returns to the initial `idle` state, discarding all received pages and the cursor. */
  reset(): void {
    const priorState = this.state;
    const step = this.machine.transition(priorState, { 'type': 'reset' });

    this.#commitUnlessSuperseded(priorState, step.state);
    this.#throwPendingHookPropagation();
  }

  /**
   * Commits `computedState` unless `this.state` has already moved past
   * `priorState` — which only happens when a hook fired during this same
   * `transition()` call reentrantly called `next()`/`reset()` and that
   * reentrant call already committed a state built on top of this call's own
   * early commit (see the owned machine's `onTransition`/`onEnterState` fire
   * points). In that case `computedState` is stale (it was captured before the
   * reentrant call ran) and committing it here would silently discard the
   * reentrant call's newer, correct commit.
   */
  #commitUnlessSuperseded(
    priorState: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    computedState: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>
  ): void {
    if (this.state === priorState) {
      this.state = computedState;
    }
  }

  /** Clears and throws a hook failure staged for propagation during a completed transition, if any. */
  #throwPendingHookPropagation(): void {
    const failure = this.#pendingHookPropagation;
    if (failure !== undefined) {
      this.#pendingHookPropagation = undefined;
      throw failure;
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override in a subclass to observe
  // transitions without coupling this class to any logging/metrics library.
  // ---------------------------------------------------------------------------

  protected onTransition(
    _from: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    _to: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    _event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>
  ): void {}

  protected onEnterState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>
  ): void {}

  protected onExitState(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>
  ): void {}

  protected onTransitionRejected(
    _state: PaginatorIdleStateEntity.Type
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorExhaustedStateInterface<TPage>,
    _event: PaginatorResetEventEntity.Type | PaginatorPageReceivedEventInterface<TPage, TCursor>,
    _reason: string
  ): void {}
}
