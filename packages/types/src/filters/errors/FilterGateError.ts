/**
 * @module FilterGateError
 * @description Error thrown when a logical gate is invalid or not supported
 */

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterGateError
 */
export interface FilterGateErrorDetails {
  // Reports the raw, possibly-invalid gate value under diagnosis - not
  // guaranteed to be a string (e.g. an unregistered LogicGateFunction).
  'gate'?: unknown;
  'validGates'?: string[];
}

/**
 * Error thrown when a logical gate is invalid or not supported
 */
export class FilterGateError extends FilterError {
  public readonly details: FilterGateErrorDetails;
  public readonly gate: unknown;
  public readonly validGates: string[] | null;

  /**
   * Creates a FilterGateError
   * @param message - Error message
   * @param details - Additional error details
   * @param cause - The cause of this error
   */
  constructor(message: string, details: FilterGateErrorDetails = {}, cause?: Error) {
    const code = ErrorCodes.CORE.INVALID_LOGICAL_GATE;

    super(message, code, cause);

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor?.name || 'FilterGateError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details ?? {};

    // Initialize all properties unconditionally for V8 optimization (maintaining hidden classes)
    this.gate = (details && 'gate' in details) ? (details.gate ?? null) : null;
    this.validGates = (details && 'validGates' in details) ? (details.validGates ?? null) : null;
  }

  static {
    // Ensure proper prototype chain
    this.prototype.constructor = this;
  }
}
