/** Runtime options for RetryError construction. */
import type { ErrorWithCodeEntity } from '@studnicky/errors';

export interface RetryErrorOptionsInterface {
  readonly 'cause'?: Error;
  readonly 'code'?: ErrorWithCodeEntity.Type['code'];
  readonly 'errors'?: readonly Error[];
}
