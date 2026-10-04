import { FetchBaseError } from './FetchBaseError.js';

export class RequestFailedError extends FetchBaseError {
  public override readonly name: string = 'RequestFailedError';

  /**
   * The URL that was fetched
   */
  readonly url: string;

  constructor(url: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'fetch.requestFailed',
      'message': `Request to ${url} failed: ${FetchBaseError.toMessage(cause)}`,
      'retryable': false
    });
    this.url = url;
  }

  /** The platform rejection this request failure wraps. */
  public platformCause(): unknown {
    const result = this.cause;
    return result;
  }
}
