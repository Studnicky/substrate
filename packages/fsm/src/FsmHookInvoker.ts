import { HookInvoker } from '@studnicky/errors/node';

export class FsmHookInvoker extends HookInvoker {
  protected override onHookError(): void {}
}
