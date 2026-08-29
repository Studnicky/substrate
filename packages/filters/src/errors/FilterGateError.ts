/**
 * @module FilterGateError
 * @description Error thrown when a logical gate is invalid or not supported
 */

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Details for FilterGateError
 */
export interface FilterGateErrorDetailsInterface {
  'cause'?: Error | undefined;
  // Reports the raw, possibly-invalid gate value under diagnosis - not
  // guaranteed to be a string (e.g. an unregistered LogicGateFunctionInterface).
  'gate'?: unknown;
  'validGates'?: readonly string[];
}

/**
 * Error thrown when a logical gate is invalid or not supported
 */
export class FilterGateError extends FilterError {
  public readonly details: FilterGateErrorDetailsInterface;
  public readonly gate: unknown;
  public readonly validGates: readonly string[] | null;

  /**
   * Creates a FilterGateError
   * @param message - Error message
   * @param details - Additional error details, including an optional cause
   */
  constructor(message: string, details: FilterGateErrorDetailsInterface = {}) {
    const code = ErrorCodes.CORE.INVALID_LOGICAL_GATE;

    super(message, { 'cause': details.cause, 'code': code });

    // Set the name to the constructor name for proper inheritance
    this.name = this.constructor.name !== '' ? this.constructor.name : 'FilterGateError';

    // Initialize all properties in consistent order for V8 hidden class optimization
    // Always create the same shape regardless of input
    this.details = details;

    // Initialize all properties unconditionally for V8 optimization (maintaining hidden classes)
    this.gate = ('gate' in details) ? (details.gate ?? null) : null;
    this.validGates = ('validGates' in details) ? (details.validGates ?? null) : null;
  }

  protected override serializeExtra(): Record<string, unknown> {
    // An absent member is omitted rather than emitted as `undefined`: RFC 9457
    // consumers test member presence, and BaseError omits its own the same way.
    return {
      ...(this.details === undefined ? {} : { 'details': this.details }),
      ...(this.gate === undefined ? {} : { 'gate': this.gate }),
      ...(this.validGates === undefined ? {} : { 'validGates': this.validGates })
    };
  }

  static {
    // Ensure proper prototype chain
    FilterGateError.prototype.constructor = FilterGateError;
  }
}
