import type { ErrorConstructorOptionsInterface } from '@studnicky/errors/interfaces';

import { BaseError, DomainErrorArgumentList } from '@studnicky/errors/node';

/** Optional construction arguments for {@link BatchError}; the class supplies its own code and message. */
/** Thrown when batch configuration is invalid. */
export class BatchError extends BaseError {
  public constructor(message: string, argumentList?: ErrorConstructorOptionsInterface) {
    const fields = { 'message': message };
    super(DomainErrorArgumentList.build(fields, {
      'cause': argumentList?.cause,
      'code': 'batch.invalidConfig',
      'correlationId': argumentList?.correlationId,
      'message': (messageFields: Readonly<{ 'message': string }>): string => {
        const result = messageFields.message;
        return result;
      },
      'metadata': argumentList?.metadata,
      'retryable': argumentList?.retryable ?? false
    }));
  }
}
