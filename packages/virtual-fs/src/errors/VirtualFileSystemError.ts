import type { ErrorConstructorOptionsInterface } from '@studnicky/errors/interfaces';

import { BaseError, DomainErrorArgumentList } from '@studnicky/errors/node';

/** Optional construction arguments for {@link VirtualFileSystemError}; the class supplies its own code and message. */
export class VirtualFileSystemError extends BaseError {
  public constructor(message: string, argumentList?: ErrorConstructorOptionsInterface) {
    const fields = { 'message': message };
    super(DomainErrorArgumentList.build(fields, {
      'cause': argumentList?.cause,
      'code': 'virtualFs.error',
      'correlationId': argumentList?.correlationId,
      'message': (messageFields: Readonly<{ 'message': string }>): string => {
        return messageFields.message;
      },
      'metadata': argumentList?.metadata,
      'retryable': argumentList?.retryable ?? false
    }));
  }
}
