/**
 * @module FilterConfigurationError
 * @description Error thrown when filter configuration is invalid
 */

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterConfigurationError
 */
export interface FilterConfigurationErrorDetails {
  // Allow additional properties
  [key: string]: unknown;
  'expectedType'?: string;
  'gate'?: unknown;
  'groupGates'?: unknown;
  'index'?: number;
  'property'?: string;
  // Reports the raw, possibly-invalid config value under diagnosis - not filter
  // data, so it is not constrained to FilterValue (e.g. functions, unregistered
  // gate/mode references).
  'value'?: unknown;
}

/**
 * Error thrown when filter configuration is invalid
 * Used for structural validation errors in filter definitions
 */
export class FilterConfigurationError extends FilterError {
  public readonly details: FilterConfigurationErrorDetails;
  public readonly index: number | null;
  public readonly property: string | null;
  public readonly value: unknown;

  /**
   * Creates a FilterConfigurationError
   * @param message - Error message
   * @param details - Additional error details
   * @param cause - The cause of this error
   */
  constructor(message: string, details: FilterConfigurationErrorDetails = {}, cause?: Error) {
    const code = ErrorCodes.CORE.INVALID_FILTER_CONFIG;

    super(message, code, cause);

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor?.name || 'FilterConfigurationError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details ?? {};
    this.index = details?.index ?? null;
    this.property = details?.property ?? null;
    this.value = details?.value ?? null;
  }

  static {
    // Ensure proper prototype chain
    this.prototype.constructor = this;
  }
}
