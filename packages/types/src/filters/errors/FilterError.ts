/**
 * @module FilterError
 * @description Base class for all FilterEngine errors
 */

/**
 * Options for constructing a FilterError
 */
export interface FilterErrorOptionsInterface {
  'cause'?: Error | undefined;
  'code'?: string | undefined;
}

/**
 * Base class for all FilterEngine errors
 * Follows MDN Error specification with proper prototype chain
 */
export class FilterError extends Error {
  public override readonly cause: Error | null;
  public readonly code: string | null;

  /**
   * Creates a FilterError
   */
  constructor(message: string, options?: FilterErrorOptionsInterface) {
    super(message);

    // Set the name to the constructor name
    this.name = this.constructor.name !== '' ? this.constructor.name : 'FilterError';

    // Handle code parameter - convert only undefined to null, preserve everything else
    this.code = options?.code ?? null;

    // Handle cause parameter - convert only undefined to null, preserve everything else
    this.cause = options?.cause ?? null;
  }

  /**
   * Error's own `message` property is non-enumerable, so JSON.stringify() drops it by default.
   * A subclass that adds fields (e.g. FilterGateError's `gate`) must override this and spread
   * `super.toJSON()` — spreading `this` directly is forbidden by lexical-this-only.
   */
  public toJSON(): Record<string, unknown> {
    return {
      'cause': this.cause,
      'code': this.code,
      'message': this.message,
      'name': this.name
    };
  }

  static {
    // Ensure proper prototype chain
    FilterError.prototype.constructor = FilterError;
  }
}
