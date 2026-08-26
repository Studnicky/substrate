/**
 * @module FilterOperatorError
 * @description Error thrown when an operator is unknown or not registered
 */

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterOperatorError
 */
export interface FilterOperatorErrorDetailsInterface {
  'availableOperators'?: readonly string[];
  'cause'?: Error | undefined;
  'index'?: number;
  'operator'?: string;
}

/**
 * Error thrown when an operator is unknown or not registered
 */
export class FilterOperatorError extends FilterError {
  public readonly availableOperators: readonly string[] | null;
  public readonly details: FilterOperatorErrorDetailsInterface;
  public readonly index: number | null;
  public readonly operator: string | null;

  /**
   * Creates a FilterOperatorError
   * @param message - Error message
   * @param details - Additional error details, including an optional cause
   */
  constructor(message: string, details: FilterOperatorErrorDetailsInterface = {}) {
    const code = ErrorCodes.CORE.UNKNOWN_OPERATOR;

    super(message, { 'cause': details.cause, 'code': code });

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor.name !== '' ? this.constructor.name : 'FilterOperatorError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details;

    // Initialize all properties unconditionally for V8 optimization (maintaining hidden classes)
    this.operator = ('operator' in details) ? (details.operator ?? null) : null;
    this.availableOperators = ('availableOperators' in details) ? (details.availableOperators ?? null) : null;
    this.index = ('index' in details) ? (details.index ?? null) : null;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      'availableOperators': this.availableOperators,
      'details': this.details,
      'index': this.index,
      'operator': this.operator
    };
  }

  static {
    // Ensure proper prototype chain
    FilterOperatorError.prototype.constructor = FilterOperatorError;
  }
}
