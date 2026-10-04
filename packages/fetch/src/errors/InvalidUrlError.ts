import { FetchBaseError } from './FetchBaseError.js';

export class InvalidUrlError extends FetchBaseError {
  public override readonly name: string = 'InvalidUrlError';

  /**
   * The value that failed URL parsing
   */
  readonly url: string;

  constructor(url: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'fetch.urlInvalid',
      'message': `Invalid URL: ${url}: ${FetchBaseError.toMessage(cause)}`,
      'retryable': false
    });
    this.url = url;
  }
}
