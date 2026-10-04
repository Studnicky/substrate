import { BaseError } from '@studnicky/types/node';

/**
 * Thrown when one case of a scenario file is rejected by its entity's intake; the message names the case position and carries the entity's diagnostics.
 * Code: `'scenarioKit.caseInvalid'`.
 */
export class ScenarioCaseIntakeError extends BaseError {
  public override readonly name: string = 'ScenarioCaseIntakeError';

  public constructor(message: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'scenarioKit.caseInvalid',
      'message': message,
      'retryable': false
    });
  }
}
