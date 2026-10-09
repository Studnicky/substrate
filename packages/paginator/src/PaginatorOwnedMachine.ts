import type { HookInvoker } from '#runtime';

import { RuntimeError } from '#runtime';

import type { PaginatorIdleStateEntity } from './entities/PaginatorIdleStateEntity.js';
import type { PaginatorResetEventEntity } from './entities/PaginatorResetEventEntity.js';
import type { PaginatorExhaustedStateInterface } from './interfaces/PaginatorExhaustedStateInterface.js';
import type { PaginatorHasMoreStateInterface } from './interfaces/PaginatorHasMoreStateInterface.js';
import type { PaginatorOwnerInterface } from './interfaces/PaginatorOwnerInterface.js';
import type { PaginatorPageReceivedEventInterface } from './interfaces/PaginatorPageReceivedEventInterface.js';

import { PaginatorMachine } from './PaginatorMachine.js';

/** Forwards machine fire points to the owning paginator, committing state before consumer hooks run. */
export class PaginatorOwnedMachine<TPage, TCursor> extends PaginatorMachine<TPage, TCursor> {
  private owner: PaginatorOwnerInterface<TPage, TCursor> | null = null;

  private readonly consumerHooks: HookInvoker;

  public constructor(consumerHooks: HookInvoker) {
    super();
    this.consumerHooks = consumerHooks;
  }

  /** @internal Binds the paginator whose state and hooks this machine drives. */
  public attachOwner(owner: PaginatorOwnerInterface<TPage, TCursor>): void {
    this.owner = owner;
  }

  protected override onTransition(
    from: PaginatorExhaustedStateInterface<TPage>
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorIdleStateEntity.Type,
    nextState: PaginatorExhaustedStateInterface<TPage>
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorIdleStateEntity.Type,
    event: PaginatorPageReceivedEventInterface<TPage, TCursor> | PaginatorResetEventEntity.Type
  ): void {
    super.onTransition(from, nextState, event);
    const owner = this.requireOwner();

    this.consumerHooks.invoke('onTransition', () => {
      owner.commitState(nextState);
      const result = owner.reportTransition(from, nextState, event);

      return result;
    });
  }

  protected override onEnterState(state: PaginatorExhaustedStateInterface<TPage>
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorIdleStateEntity.Type): void {
    void super.onEnterState(state);
    const owner = this.requireOwner();

    this.consumerHooks.invoke('onEnterState', () => {
      owner.commitState(state);
      const result = owner.reportEnterState(state);

      return result;
    });
  }

  protected override onExitState(state: PaginatorExhaustedStateInterface<TPage>
    | PaginatorHasMoreStateInterface<TPage, TCursor>
    | PaginatorIdleStateEntity.Type): void {
    super.onExitState(state);
    const owner = this.requireOwner();

    this.consumerHooks.invoke('onExitState', () => {
      const result = owner.reportExitState(state);

      return result;
    });
  }

  protected override onTransitionRejected(
    state: PaginatorExhaustedStateInterface<TPage>
      | PaginatorHasMoreStateInterface<TPage, TCursor>
      | PaginatorIdleStateEntity.Type,
    event: PaginatorPageReceivedEventInterface<TPage, TCursor> | PaginatorResetEventEntity.Type,
    reason: string
  ): void {
    super.onTransitionRejected(state, event, reason);
    const owner = this.requireOwner();

    this.consumerHooks.invoke('onTransitionRejected', () => {
      const result = owner.reportTransitionRejected(state, event, reason);

      return result;
    });
  }

  private requireOwner(): PaginatorOwnerInterface<TPage, TCursor> {
    if (this.owner === null) {
      throw RuntimeError.create('PaginatorOwnedMachine has no owning paginator attached');
    }

    return this.owner;
  }
}
