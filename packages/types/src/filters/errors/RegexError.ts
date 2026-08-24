/**
 * @module RegexError
 * @description Error class for regex-related issues including ReDoS vulnerabilities
 */

import type { ErrorDetails } from '../types.js';

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Context for RegexError
 */
export interface RegexErrorContext extends ErrorDetails {
  'errorCode'?: string;
}

/**
 * Error thrown when regex operations fail or are too dangerous
 * @extends FilterError
 */
export class RegexError extends FilterError {
  public readonly context: RegexErrorContext;

  /**
   * Creates a new RegexError
   * @param message - Error message
   * @param context - Additional error context
   * @param cause - Optional cause error
   */
  constructor(message: string, context: RegexErrorContext = {}, cause?: Error) {
    // Use the errorCode from context if provided, otherwise default to REGEX_ERROR
    const errorCode = context.errorCode || ErrorCodes.CORE.REGEX_ERROR;

    super(message, errorCode, cause);
    this.name = 'RegexError';
    this.context = context;
  }
}
