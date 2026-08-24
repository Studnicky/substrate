/**
 * @module FilterCompilationError
 * @description Error thrown when filter compilation fails
 */

import type { FilterCondition } from '../types.js';

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterCompilationError
 */
export interface FilterCompilationErrorDetails {
  'input'?: FilterCondition;
  'phase'?: string;
}

/**
 * Error thrown when filter compilation fails
 * Used for errors during the compilation/optimization phase
 */
export class FilterCompilationError extends FilterError {
  public readonly details: FilterCompilationErrorDetails;
  public readonly input: FilterCondition | null;
  public readonly phase: string | null;

  /**
   * Creates a FilterCompilationError
   * @param message - Error message
   * @param details - Additional error details
   * @param cause - The cause of this error
   */
  constructor(message: string, details: FilterCompilationErrorDetails = {}, cause?: Error) {
    const code = ErrorCodes.CORE.FILTER_COMPILATION_ERROR;

    super(message, code, cause);

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor?.name || 'FilterCompilationError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details ?? {};
    this.phase = details?.phase ?? null;
    this.input = details?.input ?? null;
  }

  static {
    // Ensure proper prototype chain
    this.prototype.constructor = this;
  }
}
