import { BaseError } from './BaseError.js';
/**
 * Error thrown when a lifecycle hook implementation throws during invocation.
 *
 * @module
 */
import { ErrorCodeRegistry } from './ErrorCodeRegistry.js';

// Register at module load.
ErrorCodeRegistry.register({
  'code': 'errors.hookInvocationFailed',
  'description': 'A lifecycle hook implementation threw during invocation.',
  'retryable': false
});

/**
 * Thrown when a lifecycle hook implementation throws (synchronously or via a
 * rejected promise) during invocation. Carries the name of the hook that
 * failed and the original thrown value as `cause`.
 */
export class HookInvocationError extends BaseError {
  /** Name of the lifecycle hook that threw during invocation. */
  public readonly hookName: string;

  public constructor(hookName: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'errors.hookInvocationFailed',
      'message': `Hook "${hookName}" threw during invocation`,
      'retryable': false
    });
    this.hookName = hookName;
  }
}
