import { BaseError } from '@studnicky/types/node';

/**
 * Thrown when a scenario value does not have the type a reader requires.
 * Code: `'scenarioKit.valueInvalid'`.
 */
export class ScenarioValueError extends BaseError {
  public override readonly name: string = 'ScenarioValueError';

  public constructor(message: string) {
    super({
      'code': 'scenarioKit.valueInvalid',
      'message': message,
      'retryable': false
    });
  }
}
