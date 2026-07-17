import { BaseError } from './BaseError.js';
/**
 * Error thrown when a lifecycle hook is invoked reentrantly from within its own call stack.
 *
 * @module
 */
import { ErrorCodeRegistry } from './ErrorCodeRegistry.js';

// Register at module load.
ErrorCodeRegistry.register({
  'code': 'errors.reentrantHookInvocation',
  'description': 'A lifecycle hook was invoked reentrantly, synchronously, from within its own call stack.',
  'retryable': false
});

/**
 * Thrown when a consumer's hook override calls back — synchronously, on the
 * same call stack — into whatever triggered it, before that outer call has
 * finished. A hook that does this is a bug in the override, not something
 * the invoking class can safely absorb: depending on the caller, the
 * result is either silent state corruption (a mutation committed by the
 * outer frame after the inner frame already computed from stale state) or
 * unbounded recursion. Thrown immediately, synchronously, at the point of
 * reentry — never deferred or silently swallowed.
 */
export class ReentrantHookInvocationError extends BaseError {
  /** Name of the lifecycle hook that was invoked reentrantly. */
  public readonly hookName: string;

  public constructor(hookName: string) {
    super({
      'code': 'errors.reentrantHookInvocation',
      'message': `Hook "${hookName}" was invoked reentrantly from within its own call stack`,
      'retryable': false
    });
    this.hookName = hookName;
  }
}
