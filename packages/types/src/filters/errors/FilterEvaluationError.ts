/**
 * @module FilterEvaluationError
 * @description Error thrown when filter evaluation fails
 */

import type { FilterValue } from '../types.js';

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterEvaluationError
 */
export interface FilterEvaluationErrorDetails {
  'operator'?: string;
  'path'?: string;
  'value'?: FilterValue;
}

/**
 * Error thrown when filter evaluation fails
 * Used for runtime errors during filter evaluation
 */
export class FilterEvaluationError extends FilterError {
  public readonly details: FilterEvaluationErrorDetails;
  public readonly operator: string | null;
  public readonly path: string | null;
  public readonly value: FilterValue | null;

  /**
   * Creates a FilterEvaluationError
   * @param message - Error message
   * @param details - Additional error details
   * @param cause - The cause of this error
   */
  constructor(message: string, details: FilterEvaluationErrorDetails = {}, cause?: Error) {
    const code = ErrorCodes.CORE.FILTER_EVALUATION_ERROR;

    super(message, code, cause);

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor?.name || 'FilterEvaluationError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details ?? {};

    // Initialize all properties unconditionally for V8 optimization (maintaining hidden classes)
    this.operator = (details && 'operator' in details) ? (details.operator ?? null) : null;
    this.path = (details && 'path' in details) ? (details.path ?? null) : null;
    this.value = (details && 'value' in details) ? (details.value ?? null) : null;
  }

  static {
    // Ensure proper prototype chain
    this.prototype.constructor = this;
  }
}
