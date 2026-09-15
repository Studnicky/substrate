/**
 * @module FilterError
 * @description Base class for all FilterEngine errors
 */

import type { BaseErrorArgumentsInterface } from '@studnicky/errors/interfaces';

import { BaseError } from '@studnicky/errors/node';

/**
 * Options for constructing a FilterError
 */
export interface FilterErrorOptionsInterface extends Omit<BaseErrorArgumentsInterface, 'message'> {}

/**
 * Base class for all FilterEngine errors
 * Extends the workspace error contract while preserving filter-specific codes.
 */
export class FilterError extends BaseError {
  /** Creates a FilterError. */
  public constructor(message: string, options: FilterErrorOptionsInterface) {
    super({ ...options, 'message': message });
  }
}
