/**
 * @module FilterEvaluationError
 * @description Error thrown when filter evaluation fails
 */

import type { FilterValueEntity } from '../FilterValueEntity.js';

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterEvaluationError
 */
export interface FilterEvaluationErrorDetailsInterface {
  'cause'?: Error | undefined;
  'operator'?: string;
  'path'?: string;
  'value'?: FilterValueEntity.Type;
}

/**
 * Error thrown when filter evaluation fails
 * Used for runtime errors during filter evaluation
 */
export class FilterEvaluationError extends FilterError {
  public readonly details: FilterEvaluationErrorDetailsInterface;
  public readonly operator: string | null;
  public readonly path: string | null;
  public readonly value: FilterValueEntity.Type | null;

  /**
   * Creates a FilterEvaluationError
   * @param message - Error message
   * @param details - Additional error details, including an optional cause
   */
  constructor(message: string, details: FilterEvaluationErrorDetailsInterface = {}) {
    const code = ErrorCodes.CORE.FILTER_EVALUATION_ERROR;

    super(message, { 'cause': details.cause, 'code': code });

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor.name !== '' ? this.constructor.name : 'FilterEvaluationError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details;

    // Initialize all properties unconditionally for V8 optimization (maintaining hidden classes)
    this.operator = ('operator' in details) ? (details.operator ?? null) : null;
    this.path = ('path' in details) ? (details.path ?? null) : null;
    this.value = ('value' in details) ? (details.value ?? null) : null;
  }

  protected override serializeExtra(): Record<string, unknown> {
    // An absent member is omitted rather than emitted as `undefined`: RFC 9457
    // consumers test member presence, and BaseError omits its own the same way.
    return {
      ...(this.details === undefined ? {} : { 'details': this.details }),
      ...(this.operator === undefined ? {} : { 'operator': this.operator }),
      ...(this.path === undefined ? {} : { 'path': this.path }),
      ...(this.value === undefined ? {} : { 'value': this.value })
    };
  }

  static {
    // Ensure proper prototype chain
    FilterEvaluationError.prototype.constructor = FilterEvaluationError;
  }
}
