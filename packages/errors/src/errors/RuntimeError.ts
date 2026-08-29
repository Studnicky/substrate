import { BaseError } from './BaseError.js';

interface RuntimeErrorOptionsInterface {
  readonly 'cause'?: unknown;
  readonly 'message': string;
}

interface RuntimeErrorCreateOptionsInterface {
  readonly 'cause'?: unknown;
}

/**
 * Generic package-owned runtime failure.
 *
 * Use a package-specific error when callers need a narrower contract. This error
 * preserves a stable `BaseError` shape for invariant and validation failures that
 * have no more specific public error type.
 */
export class RuntimeError extends BaseError {
  public static create(message: string, options?: RuntimeErrorCreateOptionsInterface): RuntimeError {
    const result = new RuntimeError({ 'cause': options?.cause, 'message': message });
    return result;
  }

  public constructor(options: RuntimeErrorOptionsInterface) {
    super({
      'cause': options.cause,
      'code': 'errors.runtime',
      'message': options.message,
      'retryable': false
    });
  }
}
