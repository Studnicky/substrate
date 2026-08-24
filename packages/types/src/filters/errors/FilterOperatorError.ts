/**
 * @module FilterOperatorError
 * @description Error thrown when an operator is unknown or not registered
 */

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterOperatorError
 */
export interface FilterOperatorErrorDetails {
  'availableOperators'?: string[];
  'index'?: number;
  'operator'?: string;
}

/**
 * Error thrown when an operator is unknown or not registered
 */
export class FilterOperatorError extends FilterError {
  public readonly availableOperators: string[] | null;
  public readonly details: FilterOperatorErrorDetails;
  public readonly index: number | null;
  public readonly operator: string | null;

  /**
   * Creates a FilterOperatorError
   * @param message - Error message
   * @param details - Additional error details
   * @param cause - The cause of this error
   */
  constructor(message: string, details: FilterOperatorErrorDetails = {}, cause?: Error) {
    const code = ErrorCodes.CORE.UNKNOWN_OPERATOR;

    super(message, code, cause);

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor?.name || 'FilterOperatorError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details ?? {};

    // Initialize all properties unconditionally for V8 optimization (maintaining hidden classes)
    this.operator = (details && 'operator' in details) ? (details.operator ?? null) : null;
    this.availableOperators = (details && 'availableOperators' in details) ? (details.availableOperators ?? null) : null;
    this.index = (details && 'index' in details) ? (details.index ?? null) : null;
  }

  static {
    // Ensure proper prototype chain
    this.prototype.constructor = this;
  }
}
