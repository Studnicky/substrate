import type { ErrorConstructorOptionsInterface } from '@studnicky/errors/interfaces';

import { BaseError, DomainErrorArgumentList } from '@studnicky/errors/node';

/** Optional construction arguments for {@link CircularBufferError}; the class supplies its own code and message. */
/** Thrown when circular buffer configuration is invalid. */
export class CircularBufferError extends BaseError {
  public constructor(message: string, argumentList?: ErrorConstructorOptionsInterface) {
    const fields = { 'message': message };
    super(DomainErrorArgumentList.build(fields, {
      'cause': argumentList?.cause,
      'code': 'circularBuffer.invalidConfig',
      'correlationId': argumentList?.correlationId,
      'message': (messageFields) => {
        return messageFields.message;
      },
      'metadata': argumentList?.metadata,
      'retryable': argumentList?.retryable ?? false
    }));
  }
}
