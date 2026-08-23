import { HookInvoker } from '@studnicky/errors';

export class FsmHookInvoker extends HookInvoker {
  protected override onHookError(): void {}
}
