import type { BaseErrorArgumentsInterface } from '#runtime';
/** Runtime options for RetryError construction. */

export interface RetryErrorOptionsInterface extends Omit<
  BaseErrorArgumentsInterface,
  'cause' | 'code' | 'message' | 'retryable'
> {
  readonly 'cause'?: Error;
  readonly 'code'?: BaseErrorArgumentsInterface['code'];
  readonly 'errors'?: readonly Error[];
}
