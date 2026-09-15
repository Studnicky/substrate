/** Runtime options for RetryError construction. */
import type { BaseErrorArgumentsInterface } from '@studnicky/errors/interfaces';

export interface RetryErrorOptionsInterface extends Omit<
  BaseErrorArgumentsInterface,
  'cause' | 'code' | 'message' | 'retryable'
> {
  readonly 'cause'?: Error;
  readonly 'code'?: BaseErrorArgumentsInterface['code'];
  readonly 'errors'?: readonly Error[];
}
