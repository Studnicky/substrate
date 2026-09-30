import { ConcurrencyError } from './ConcurrencyError.js';

/**
 * Abort reason for the per-caller timeout timer of `Coalesce.run()`.
 *
 * The timer is cancelled with this reason once the caller's wait on the shared in-flight promise
 * has finished, so the timeout race never outlives the wait it guards.
 */
export class CoalesceWaitCompletedError extends ConcurrencyError {
  public override readonly name: string = 'CoalesceWaitCompletedError';

  public readonly key: string;

  public constructor(key: string) {
    super({
      'code': 'concurrency.coalesceWaitCompleted',
      'message': `Coalesce.run() finished waiting for key "${key}"; its timeout timer is cancelled.`,
      'retryable': false
    });
    this.key = key;
  }
}
