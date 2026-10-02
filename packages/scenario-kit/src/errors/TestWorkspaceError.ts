import { BaseError } from '@studnicky/types/node';

/**
 * Thrown when a filesystem operation on a `TestWorkspace` fails; the platform error is the cause.
 * Code: `'scenarioKit.workspaceFailed'`.
 */
export class TestWorkspaceError extends BaseError {
  public override readonly name: string = 'TestWorkspaceError';

  public constructor(message: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'scenarioKit.workspaceFailed',
      'message': message,
      'retryable': false
    });
  }
}
