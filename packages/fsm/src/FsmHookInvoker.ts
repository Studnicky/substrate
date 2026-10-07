import { HookInvoker } from '#runtime';

export class FsmHookInvoker extends HookInvoker {
  protected override onHookError(): void {}
}
