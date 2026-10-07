import type { ErrorConstructorOptionsInterface } from '@studnicky/errors/interfaces';

import { BaseError, DomainErrorArgumentList } from '#runtime';


/** Optional construction arguments for {@link VirtualFileSystemError}; the class supplies its own code and message. */
export class VirtualFileSystemError extends BaseError {
  public override readonly name: string = 'VirtualFileSystemError';

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

  /**
   * Returns `cause` unchanged when it is already a `VirtualFileSystemError`; wraps any other
   * value (a Node `fs` error, a browser `DOMException`) in a `VirtualFileSystemError` carrying
   * the platform message and the original as `cause`.
   */
  public static from(cause: unknown): VirtualFileSystemError {
    const result = cause instanceof VirtualFileSystemError
      ? cause
      : new VirtualFileSystemError(BaseError.toMessage(cause), { 'cause': cause });
    return result;
  }
}
