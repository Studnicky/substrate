/**
 * @module FilterConfigurationError
 * @description Error thrown when filter configuration is invalid
 */

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterConfigurationError
 */
export interface FilterConfigurationErrorDetailsInterface {
  // Allow additional properties
  [key: string]: unknown;
  'cause'?: Error | undefined;
  'expectedType'?: string;
  'gate'?: unknown;
  'groupGates'?: unknown;
  'index'?: number;
  'property'?: string;
  // Reports the raw, possibly-invalid config value under diagnosis - not filter
  // data, so it is not constrained to FilterValueEntity.Type (e.g. functions, unregistered
  // gate/mode references).
  'value'?: unknown;
}

/**
 * Error thrown when filter configuration is invalid
 * Used for structural validation errors in filter definitions
 */
export class FilterConfigurationError extends FilterError {
  public readonly details: FilterConfigurationErrorDetailsInterface;
  public readonly index: number | null;
  public readonly property: string | null;
  public readonly value: unknown;

  /**
   * Creates a FilterConfigurationError
   * @param message - Error message
   * @param details - Additional error details, including an optional cause
   */
  constructor(message: string, details: FilterConfigurationErrorDetailsInterface = {}) {
    const code = ErrorCodes.CORE.INVALID_FILTER_CONFIG;
    const cause = details.cause instanceof Error ? details.cause : undefined;

    super(message, { 'cause': cause, 'code': code });

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor.name !== '' ? this.constructor.name : 'FilterConfigurationError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details;
    this.index = details.index ?? null;
    this.property = details.property ?? null;
    this.value = details.value ?? null;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      'details': this.details,
      'index': this.index,
      'property': this.property,
      'value': this.value
    };
  }

  static {
    // Ensure proper prototype chain
    FilterConfigurationError.prototype.constructor = FilterConfigurationError;
  }
}
