/**
 * @module FilterCompilationError
 * @description Error thrown when filter compilation fails
 */

import type { FilterConditionInterface } from '../interfaces.js';

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterCompilationError
 */
export interface FilterCompilationErrorDetailsInterface {
  'cause'?: Error | undefined;
  'input'?: FilterConditionInterface;
  'phase'?: string;
}

/**
 * Error thrown when filter compilation fails
 * Used for errors during the compilation/optimization phase
 */
export class FilterCompilationError extends FilterError {
  public readonly details: FilterCompilationErrorDetailsInterface;
  public readonly input: FilterConditionInterface | null;
  public readonly phase: string | null;

  /**
   * Creates a FilterCompilationError
   * @param message - Error message
   * @param details - Additional error details, including an optional cause
   */
  constructor(message: string, details: FilterCompilationErrorDetailsInterface = {}) {
    const code = ErrorCodes.CORE.FILTER_COMPILATION_ERROR;

    super(message, { 'cause': details.cause, 'code': code });

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor.name !== '' ? this.constructor.name : 'FilterCompilationError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details;
    this.phase = details.phase ?? null;
    this.input = details.input ?? null;
  }

  protected override serializeExtra(): Record<string, unknown> {
    // An absent member is omitted rather than emitted as `undefined`: RFC 9457
    // consumers test member presence, and BaseError omits its own the same way.
    return {
      ...(this.details === undefined ? {} : { 'details': this.details }),
      ...(this.input === undefined ? {} : { 'input': this.input }),
      ...(this.phase === undefined ? {} : { 'phase': this.phase })
    };
  }

  static {
    // Ensure proper prototype chain
    FilterCompilationError.prototype.constructor = FilterCompilationError;
  }
}
