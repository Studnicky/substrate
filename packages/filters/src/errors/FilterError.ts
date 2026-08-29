/**
 * @module FilterError
 * @description Base class for all FilterEngine errors
 */

import { BaseError } from '@studnicky/errors';

/**
 * Options for constructing a FilterError
 */
export interface FilterErrorOptionsInterface {
  'cause'?: unknown;
  'code': string;
  'retryable'?: boolean;
}

/**
 * Base class for all FilterEngine errors
 * Extends the workspace error contract while preserving filter-specific codes.
 */
export class FilterError extends BaseError {
  /** Creates a FilterError. */
  public constructor(message: string, options: FilterErrorOptionsInterface) {
    super({
      'cause': options.cause,
      'code': options.code,
      'message': message,
      'retryable': options.retryable ?? false
    });
  }
}
