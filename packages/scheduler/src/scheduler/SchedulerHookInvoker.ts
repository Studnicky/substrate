import { HookInvoker } from '#runtime';
/** Scheduler hook disposition that keeps observer failures outside scheduling control flow. */


export class SchedulerHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: Error): void {}
}
