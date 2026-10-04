import { FetchBaseError } from './FetchBaseError.js';

export class QueryEncodingError extends FetchBaseError {
  public override readonly name: string = 'QueryEncodingError';

  constructor(cause: unknown) {
    super({
      'cause': cause,
      'code': 'fetch.queryEncodingFailed',
      'message': `Query parameters could not be encoded: ${FetchBaseError.toMessage(cause)}`,
      'retryable': false
    });
  }
}
