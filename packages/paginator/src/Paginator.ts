import type { PaginatorEventType } from './types/PaginatorEventType.js';
import type { PaginatorStateType } from './types/PaginatorStateType.js';

import { PaginatorMachine } from './PaginatorMachine.js';

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
 */
export class Paginator<TPage, TCursor> {
  private readonly machine: PaginatorMachine<TPage, TCursor>;
  private state: PaginatorStateType<TPage, TCursor>;

  protected constructor() {
    this.machine = new (class extends PaginatorMachine<TPage, TCursor> {
      constructor(readonly outer: Paginator<TPage, TCursor>) {
        super();
      }

      protected override onTransition = (
        from: PaginatorStateType<TPage, TCursor>,
        to: PaginatorStateType<TPage, TCursor>,
        event: PaginatorEventType<TPage, TCursor>
      ): void => {
        super.onTransition(from, to, event);
        this.outer.onTransition(from, to, event);
      };

      protected override onEnterState = (state: PaginatorStateType<TPage, TCursor>): void => {
        super.onEnterState(state);
        this.outer.onEnterState(state);
      };

      protected override onExitState = (state: PaginatorStateType<TPage, TCursor>): void => {
        super.onExitState(state);
        this.outer.onExitState(state);
      };

      protected override onTransitionRejected = (
        state: PaginatorStateType<TPage, TCursor>,
        event: PaginatorEventType<TPage, TCursor>,
        reason: string
      ): void => {
        super.onTransitionRejected(state, event, reason);
        this.outer.onTransitionRejected(state, event, reason);
      };
    })(this);
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
   * Records a fetched page. `nextCursor` of `undefined` marks the source as
   * exhausted; any other value transitions to (or stays in) `hasMore` with
   * that cursor. Throws if called after the source is already exhausted.
   */
  next(page: TPage, nextCursor: TCursor | undefined): void {
    const step = this.machine.transition(this.state, { 'nextCursor': nextCursor, 'page': page, 'type': 'pageReceived' });

    this.state = step.state;
  }

  /** Returns to the initial `idle` state, discarding all received pages and the cursor. */
  reset(): void {
    const step = this.machine.transition(this.state, { 'type': 'reset' });

    this.state = step.state;
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
