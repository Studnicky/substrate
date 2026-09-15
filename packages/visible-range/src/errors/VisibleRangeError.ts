import type { ErrorConstructorOptionsInterface } from '@studnicky/errors/interfaces';

import { BaseError, DomainErrorArgumentList } from '@studnicky/errors/node';

/** Optional construction arguments for {@link VisibleRangeError}; the class supplies its own code and message. */
/** Thrown when a {@link VisibleRangeConfigInterface} is invalid or ambiguous. */
export class VisibleRangeError extends BaseError {
  public constructor(message: string, argumentList?: ErrorConstructorOptionsInterface) {
    const fields = { 'message': message };
    super(DomainErrorArgumentList.build(fields, {
      'cause': argumentList?.cause,
      'code': 'visibleRange.invalidConfig',
      'correlationId': argumentList?.correlationId,
      'message': (messageFields) => {
        const messagePayload = { 'message': messageFields.message };
        return messagePayload.message;
      },
      'metadata': argumentList?.metadata,
      'retryable': argumentList?.retryable ?? false
    }));
  }
}
