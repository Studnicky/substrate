/** Scheduler hook disposition that keeps observer failures outside scheduling control flow. */

import { HookInvoker } from '@studnicky/errors';

export class SchedulerHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {}
}
