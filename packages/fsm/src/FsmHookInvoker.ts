import { HookInvoker } from '@studnicky/errors/browser';

export class FsmHookInvoker extends HookInvoker {
  protected override onHookError(): void {}
}
