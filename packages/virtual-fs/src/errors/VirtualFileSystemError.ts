import { BaseError, type BaseErrorArgumentsType } from '@studnicky/errors';

export class VirtualFileSystemError extends BaseError {
  public constructor(message: string, args?: Partial<Omit<BaseErrorArgumentsType, 'code' | 'message'>>) {
    super({ ...args, 'code': 'virtualFs.error', 'message': message, 'retryable': false });
  }
}
