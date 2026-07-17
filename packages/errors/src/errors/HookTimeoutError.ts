import { BaseError } from './BaseError.js';
/**
 * Error thrown when a lifecycle hook does not settle within a configured timeout.
 *
 * @module
 */
import { ErrorCodeRegistry } from './ErrorCodeRegistry.js';

// Register at module load.
ErrorCodeRegistry.register({
  'code': 'errors.hookInvocationTimedOut',
  'description': 'A lifecycle hook implementation did not settle within its configured timeout.',
  'retryable': false
});

/**
 * Thrown when a hook's returned promise neither resolves nor rejects within
 * `timeoutMs`. Distinct from `HookInvocationError`, which means the hook
 * itself threw or rejected — this means it never produced an outcome at
 * all, so there is no underlying cause to carry.
 */
export class HookTimeoutError extends BaseError {
  /** Name of the lifecycle hook that failed to settle in time. */
  public readonly hookName: string;

  /** The timeout, in milliseconds, that elapsed without the hook settling. */
  public readonly timeoutMs: number;

  public constructor(hookName: string, timeoutMs: number) {
    super({
      'code': 'errors.hookInvocationTimedOut',
      'message': `Hook "${hookName}" did not settle within ${timeoutMs.toString()}ms`,
      'retryable': false
    });
    this.hookName = hookName;
    this.timeoutMs = timeoutMs;
  }
}
