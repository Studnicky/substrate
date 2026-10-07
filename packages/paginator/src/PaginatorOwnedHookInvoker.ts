import { HookInvocationError, HookInvoker, RuntimeError } from '#runtime';

import type { PaginatorOwnerInterface } from './interfaces/PaginatorOwnerInterface.js';

/** Stages consumer hook failures on the owning paginator so they surface once the transition completes. */
export class PaginatorOwnedHookInvoker<TPage, TCursor> extends HookInvoker {
  private owner: PaginatorOwnerInterface<TPage, TCursor> | null = null;

  public constructor() {
    super({ 'detectReentrancy': true });
  }

  /** @internal Binds the paginator that receives staged hook failures. */
  public attachOwner(owner: PaginatorOwnerInterface<TPage, TCursor>): void {
    this.owner = owner;
  }

  protected override onHookError(hookName: string, cause: Error): void {
    let failure = new HookInvocationError(hookName, cause);

    if (cause instanceof HookInvocationError) {
      failure = cause;
    }
    this.requireOwner().stageHookFailure(failure);
  }

  private requireOwner(): PaginatorOwnerInterface<TPage, TCursor> {
    if (this.owner === null) {
      throw RuntimeError.create('PaginatorOwnedHookInvoker has no owning paginator attached');
    }

    return this.owner;
  }
}
