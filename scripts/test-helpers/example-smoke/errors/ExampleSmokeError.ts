import { BaseError, type BaseErrorArgumentsInterface } from '@studnicky/types/node';

export interface ExampleSmokeErrorOptionsInterface extends Omit<BaseErrorArgumentsInterface, 'retryable'> {}

export class ExampleSmokeError extends BaseError {
  public override readonly name: string = 'ExampleSmokeError';

  public constructor(options: ExampleSmokeErrorOptionsInterface) {
    super({ ...options, 'retryable': false });
  }
}
