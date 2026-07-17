import { HookInvocationError, HookInvoker } from '@studnicky/errors';

import type { PaginatorEventType, PaginatorNextCursorType } from './types/PaginatorEventType.js';
import type { PaginatorStateType } from './types/PaginatorStateType.js';

import { PaginatorMachine } from './PaginatorMachine.js';

/** Forwarding targets for `PaginatorMachineDelegate` — bound `Paginator` hook methods. */
interface PaginatorMachineDelegateHooksInterface<TPage, TCursor> {
  readonly 'onEnterState': (state: PaginatorStateType<TPage, TCursor>) => void;
  readonly 'onExitState': (state: PaginatorStateType<TPage, TCursor>) => void;
  readonly 'onTransition': (
    from: PaginatorStateType<TPage, TCursor>,
    to: PaginatorStateType<TPage, TCursor>,
    event: PaginatorEventType<TPage, TCursor>
  ) => void;
  readonly 'onTransitionRejected': (
    state: PaginatorStateType<TPage, TCursor>,
    event: PaginatorEventType<TPage, TCursor>,
    reason: string
  ) => void;
}

/**
 * Delegates `PaginatorMachine`'s lifecycle hooks to the owning `Paginator`'s
 * protected hooks. Hoisted to module scope so V8 compiles this class once
 * rather than per `Paginator` instantiation.
 */
class PaginatorMachineDelegate<TPage, TCursor> extends PaginatorMachine<TPage, TCursor> {
  constructor(private readonly delegateHooks: PaginatorMachineDelegateHooksInterface<TPage, TCursor>) {
    super();
  }

  protected override onTransition = (
    from: PaginatorStateType<TPage, TCursor>,
    to: PaginatorStateType<TPage, TCursor>,
    event: PaginatorEventType<TPage, TCursor>
  ): void => {
    super.onTransition(from, to, event);
    this.delegateHooks.onTransition(from, to, event);
  };

  protected override onEnterState = (state: PaginatorStateType<TPage, TCursor>): void => {
    super.onEnterState(state);
    this.delegateHooks.onEnterState(state);
  };

  protected override onExitState = (state: PaginatorStateType<TPage, TCursor>): void => {
    super.onExitState(state);
    this.delegateHooks.onExitState(state);
  };

  protected override onTransitionRejected = (
    state: PaginatorStateType<TPage, TCursor>,
    event: PaginatorEventType<TPage, TCursor>,
    reason: string
  ): void => {
    super.onTransitionRejected(state, event, reason);
    this.delegateHooks.onTransitionRejected(state, event, reason);
  };
}

/**
 * Composed `HookInvoker` for `Paginator` — records a hook failure into the
 * owning `Paginator`'s `#pendingHookFailure` field via a constructor callback
 * instead of throwing. Hoisted to module scope so V8 compiles this class once
 * rather than per `Paginator` instantiation.
 */
class PaginatorHookInvoker extends HookInvoker {
  constructor(private readonly recordFailure: (hookName: string, cause: unknown) => void) {
    super({ 'detectReentrancy': true });
  }

  /**
   * Records the failure instead of throwing here — see `Paginator`'s class
   * doc for why a synchronous throw from this method would never reach
   * `next()`/`reset()`'s caller. `next()`/`reset()` rethrow the recorded
   * failure via `#rethrowPendingHookFailure()` once `machine.transition()`
   * returns, clear of the fsm package's own transition-integrity safety net.
   */
  protected override onHookError<T>(hookName: string, cause: unknown): T {
    this.recordFailure(hookName, cause);
    return undefined as T;
  }
}

/**
 * Tracks cursor/page-list state for a paginated data source. Does not fetch
 * data — the caller supplies fetched pages via `next()`; this primitive only
 * tracks what pages have been received, the cursor for the next page, and
 * whether more pages are expected.
 *
 * Composes an internal `@studnicky/fsm` `StateMachine` rather than extending
 * it, and delegates the internal machine's lifecycle hooks to `Paginator`'s
 * own protected hooks so subclasses can observe transitions without reaching
 * into the internal machine.
 *
 * Composes a `HookInvoker` rather than `PaginatorMachine`: the internal state
 * machine is single-inheritance-committed to `PaginatorMachine` (via the
 * hoisted `PaginatorMachineDelegate`), so a base-class hook invoker has
 * nowhere to attach there. The actual hook-invocation surface external
 * consumers can break, though, is `Paginator`'s own `onEnterState`/
 * `onExitState`/`onTransition`/`onTransitionRejected` methods below — an
 * arbitrary subclass override of any of them, including one that is
 * unexpectedly `async`, is what every fire point in this constructor now
 * routes through `this.hooks.invoke`.
 *
 * The composed `PaginatorHookInvoker` overrides `onHookError` to record
 * rather than throw, and `next()`/`reset()` rethrow a recorded failure once
 * `machine.transition()` returns — not to swallow it (compare `Batch`/
 * `EntityStore`, which swallow permanently), but because a synchronous throw
 * from `onHookError` here would never reach that call site:
 * `PaginatorMachineDelegate` forwards to these hooks from *inside*
 * `PaginatorMachine`'s own `StateMachine.transition()`, which wraps that same
 * call in the fsm package's own hook invoker — one that intentionally
 * swallows failures so a broken observer can never revert an
 * already-computed transition step. Throwing from `PaginatorHookInvoker`'s
 * own `onHookError` would just be caught and silently absorbed by that
 * unrelated, outer safety net before ever reaching `next()`/`reset()`'s
 * caller. Recording the failure and rethrowing it once control returns past
 * that boundary is what makes a broken hook surface as a `HookInvocationError`
 * instead of vanishing into fsm's transition-integrity net.
 *
 * `next()`/`reset()` commit `this.state` from the `onTransition`/
 * `onEnterState` closures above, before invoking the consumer's override,
 * rather than only after `machine.transition()` returns. This matters
 * because a hook override is free to call `next()`/`reset()` again,
 * synchronously, on this same `Paginator` — a plausible "auto-fetch the next
 * page from `onEnterState`" pattern. Committing early means that reentrant
 * call reads the state this call already produced, not the stale state this
 * call started from, so it correctly builds its own page on top. Once
 * `machine.transition()` returns to `next()`/`reset()`, `#commitUnlessSuperseded`
 * only applies this call's own (by-then possibly stale) computed state if
 * nothing else has moved `this.state` since — otherwise the reentrant call's
 * newer commit already stands and must not be overwritten. The composed
 * `PaginatorHookInvoker`'s `detectReentrancy` option is a second, independent
 * layer on top of this: it throws `ReentrantHookInvocationError` immediately
 * for a reentrant call that itself triggers a further nested hook
 * invocation on this same `HookInvoker` instance, for cases the commit
 * ordering above does not anticipate.
 */
export class Paginator<TPage, TCursor> {
  private readonly machine: PaginatorMachine<TPage, TCursor>;
  private state: PaginatorStateType<TPage, TCursor>;
  protected readonly hooks: HookInvoker;
  #pendingHookFailure: HookInvocationError | undefined;

  protected constructor() {
    this.hooks = new PaginatorHookInvoker((hookName, cause) => {
      this.#pendingHookFailure = new HookInvocationError(hookName, cause);
    });

    const onEnterState = (state: PaginatorStateType<TPage, TCursor>): void => {
      this.hooks.invoke('onEnterState', () => {
        // Commit before invoking the consumer override: if this hook
        // reentrantly calls next()/reset(), it must observe this state as
        // already current, not the stale pre-transition state next()/reset()
        // is still holding onto below.
        this.state = state;
        const result = this.onEnterState(state);
        return result;
      });
    };
    const onExitState = (state: PaginatorStateType<TPage, TCursor>): void => {
      this.hooks.invoke('onExitState', () => {
        const result = this.onExitState(state);
        return result;
      });
    };
    const onTransition = (
      from: PaginatorStateType<TPage, TCursor>,
      to: PaginatorStateType<TPage, TCursor>,
      event: PaginatorEventType<TPage, TCursor>
    ): void => {
      this.hooks.invoke('onTransition', () => {
        // Same early commit as onEnterState above — onTransition fires first
        // and already carries the target state, so a reentrant call
        // triggered from this hook also sees current state, not stale state.
        this.state = to;
        const result = this.onTransition(from, to, event);
        return result;
      });
    };
    const onTransitionRejected = (
      state: PaginatorStateType<TPage, TCursor>,
      event: PaginatorEventType<TPage, TCursor>,
      reason: string
    ): void => {
      this.hooks.invoke('onTransitionRejected', () => {
        const result = this.onTransitionRejected(state, event, reason);
        return result;
      });
    };

    this.machine = new PaginatorMachineDelegate({
      'onEnterState': onEnterState,
      'onExitState': onExitState,
      'onTransition': onTransition,
      'onTransitionRejected': onTransitionRejected
    });
    this.state = this.machine.getInitialState();
  }

  static create<TPage, TCursor>(): Paginator<TPage, TCursor> {
    return new Paginator<TPage, TCursor>();
  }

  /** `true` unless the source is known to be exhausted — true for both `idle` and `hasMore`. */
  hasNext(): boolean {
    return this.state.variant !== 'exhausted';
  }

  /** All pages received so far, in receipt order. Empty before the first page arrives. */
  get pages(): readonly TPage[] {
    return this.state.variant === 'idle' ? [] : this.state.pages;
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
  next(page: TPage, nextCursor: PaginatorNextCursorType<TCursor>): void {
    const priorState = this.state;
    const step = this.machine.transition(priorState, { 'nextCursor': nextCursor, 'page': page, 'type': 'pageReceived' });

    this.#commitUnlessSuperseded(priorState, step.state);
    this.#rethrowPendingHookFailure();
  }

  /** Returns to the initial `idle` state, discarding all received pages and the cursor. */
  reset(): void {
    const priorState = this.state;
    const step = this.machine.transition(priorState, { 'type': 'reset' });

    this.#commitUnlessSuperseded(priorState, step.state);
    this.#rethrowPendingHookFailure();
  }

  /**
   * Commits `computedState` unless `this.state` has already moved past
   * `priorState` — which only happens when a hook fired during this same
   * `transition()` call reentrantly called `next()`/`reset()` and that
   * reentrant call already committed a state built on top of this call's own
   * early commit (see the `onTransition`/`onEnterState` closures above). In
   * that case `computedState` is stale (it was captured before the reentrant
   * call ran) and committing it here would silently discard the reentrant
   * call's newer, correct commit.
   */
  #commitUnlessSuperseded(
    priorState: PaginatorStateType<TPage, TCursor>,
    computedState: PaginatorStateType<TPage, TCursor>
  ): void {
    if (this.state === priorState) {
      this.state = computedState;
    }
  }

  /** Throws and clears a hook failure recorded by `onHookError` during the just-completed `transition()` call, if any. */
  #rethrowPendingHookFailure(): void {
    const failure = this.#pendingHookFailure;
    if (failure !== undefined) {
      this.#pendingHookFailure = undefined;
      throw failure;
    }
  }

  // ---------------------------------------------------------------------------
  // Lifecycle hooks — no-op by default. Override in a subclass to observe
  // transitions without coupling this class to any logging/metrics library.
  // ---------------------------------------------------------------------------

  protected onTransition(
    _from: PaginatorStateType<TPage, TCursor>,
    _to: PaginatorStateType<TPage, TCursor>,
    _event: PaginatorEventType<TPage, TCursor>
  ): void {}

  protected onEnterState(_state: PaginatorStateType<TPage, TCursor>): void {}

  protected onExitState(_state: PaginatorStateType<TPage, TCursor>): void {}

  protected onTransitionRejected(
    _state: PaginatorStateType<TPage, TCursor>,
    _event: PaginatorEventType<TPage, TCursor>,
    _reason: string
  ): void {}
}
