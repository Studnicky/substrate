import { FetchBaseError } from './FetchBaseError.js';

export class DispatcherShutdownError extends FetchBaseError {
  public override readonly name: string = 'DispatcherShutdownError';

  constructor(message: string, cause: unknown) {
    super({
      'cause': cause,
      'code': 'fetch.dispatcherShutdownFailed',
      'message': message,
      'retryable': false
    });
  }
}
