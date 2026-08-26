/**
 * @module RegexError
 * @description Error class for regex-related issues including ReDoS vulnerabilities
 */

import type { ErrorDetailsInterface } from '../interfaces.js';

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { FilterError } from './FilterError.js';

/**
 * Context for RegexError
 */
export interface RegexErrorContextInterface extends ErrorDetailsInterface {
  'cause'?: Error | undefined;
  'errorCode'?: string;
}

/**
 * Error thrown when regex operations fail or are too dangerous
 * @extends FilterError
 */
export class RegexError extends FilterError {
  public readonly context: RegexErrorContextInterface;

  /**
   * Creates a new RegexError
   * @param message - Error message
   * @param context - Additional error context, including an optional cause
   */
  constructor(message: string, context: RegexErrorContextInterface = {}) {
    // Use the errorCode from context if provided, otherwise default to REGEX_ERROR
    const errorCode = context.errorCode !== undefined && context.errorCode !== '' ? context.errorCode : ErrorCodes.CORE.REGEX_ERROR;

    super(message, { 'cause': context.cause, 'code': errorCode });
    this.name = 'RegexError';
    this.context = context;
  }

  public override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      'context': this.context
    };
  }
}
