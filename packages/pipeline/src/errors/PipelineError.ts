/** Thrown when a pipeline stage fails. */

import { BaseError } from '@studnicky/errors';

export class PipelineError extends BaseError {
  public constructor(message: string, cause?: Error) {
    super({ 'cause': cause, 'code': 'pipeline.stageFailed', 'message': message, 'retryable': false });
  }
}
