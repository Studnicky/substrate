import type { BaseErrorArgumentsInterface } from '#runtime';

import { BaseError } from '#runtime';
/**
 * @module FilterError
 * @description Base class for all FilterEngine errors
 */


/**
 * Options for constructing a FilterError
 */
export interface FilterErrorOptionsInterface extends Omit<BaseErrorArgumentsInterface, 'message'> {}

/**
 * Base class for all FilterEngine errors
 * Extends the workspace error contract while preserving filter-specific codes.
 */
export class FilterError extends BaseError {
  public override readonly name: string = 'FilterError';

  /** Creates a FilterError. */
  public constructor(message: string, options: FilterErrorOptionsInterface) {
    super({ ...options, 'message': message });
  }
}
