import { BaseError, DomainErrorArgumentList } from '@studnicky/errors';

interface WorkerPoolErrorOptionsInterface {
  readonly 'cause'?: unknown;
  readonly 'code': string;
  readonly 'message': string;
}

export class WorkerPoolError extends BaseError {
  public constructor(options: WorkerPoolErrorOptionsInterface) {
    super(DomainErrorArgumentList.build({ 'message': options.message }, {
      'cause': options.cause,
      'code': options.code,
      'message': (fields: Readonly<{ readonly 'message': string }>): string => { return fields.message; },
      'retryable': false
    }));
  }
}
