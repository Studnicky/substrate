import { FetchBaseError } from './FetchBaseError.js';

export class BodySerializationError extends FetchBaseError {
  public override readonly name: string = 'BodySerializationError';

  constructor(cause: unknown) {
    super({
      'cause': cause,
      'code': 'fetch.bodySerializationFailed',
      'message': `Request body could not be serialized to JSON: ${FetchBaseError.toMessage(cause)}`,
      'retryable': false
    });
  }
}
