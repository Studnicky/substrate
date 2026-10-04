import { FetchBaseError } from './FetchBaseError.js';

export class ConstructionError extends FetchBaseError {
  public override readonly name: string = 'ConstructionError';

  constructor(message: string) {
    super({ 'code': 'fetch.constructionInvalid', 'message': message, 'retryable': false });
  }
}
