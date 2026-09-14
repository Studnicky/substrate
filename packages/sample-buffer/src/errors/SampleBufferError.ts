import type { ErrorConstructorOptionsInterface } from '@studnicky/errors/interfaces';

import { BaseError, DomainErrorArgumentList } from '@studnicky/errors/node';

/** Optional construction arguments for {@link SampleBufferError}; the class supplies its own code and message. */
/** Thrown when sample buffer configuration is invalid. */
export class SampleBufferError extends BaseError {
  public constructor(message: string, argumentList?: ErrorConstructorOptionsInterface) {
    const fields = { 'message': message };
    super(DomainErrorArgumentList.build(fields, {
      'cause': argumentList?.cause,
      'code': 'sampleBuffer.invalidConfig',
      'correlationId': argumentList?.correlationId,
      'message': (messageFields: Readonly<{ 'message': string }>): string => {
        return messageFields.message;
      },
      'metadata': argumentList?.metadata,
      'retryable': argumentList?.retryable ?? false
    }));
  }
}
