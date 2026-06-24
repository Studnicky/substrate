/**
 * Fluent builder for constructing normalized log entries.
 *
 * LogBody provides a type-safe, fluent API for building log entries
 * that conform to the CloudWatch indexable schema.
 *
 * Correlation IDs (requestId, traceId, userId, etc.) come from child loggers
 * via async context, not from this builder.
 *
 * @example
 * ```typescript
 * import { LogBody } from '@studnicky/logger';
 *
 * const body = LogBody.create()
 *   .component('graph')
 *   .operation('query')
 *   .status('success')
 *   .message('Query executed')
 *   .context({ resultCount: 42 })
 *   .duration(234)
 *   .build();
 *
 * logger.info(body);
 * ```
 */

import type { LogBodyDataType } from '../interfaces/LogBodyDataType.js';
import type { LogBodyInterface } from '../interfaces/LogBodyInterface.js';

import { LogBuildError } from '../errors/LogBuildError.js';
import { BaseLogEntryBuilder } from './BaseLogEntryBuilder.js';

/**
 * Fluent builder for normalized log entries.
 */
export class LogBody extends BaseLogEntryBuilder implements LogBodyInterface {
  /**
   * Create a new LogBody builder instance.
   *
   * @returns New LogBody builder
   */
  static create(): LogBody {
    const result = new this();
    return result;
  }

  private messageValue: string | undefined;

  /**
   * Protected constructor - use LogBody.create()
   */
  protected constructor() {
    super();
  }

  /**
   * Build and validate the final log body.
   * Requires component(), operation(), status(), message(), and context() to have been called.
   *
   * @returns Immutable log body data with event as 'component.operation'
   * @throws LogBuildError if required fields are missing
   */
  build(): LogBodyDataType {
    this.validateRequiredFields();

    if (this.messageValue === undefined) {
      throw new LogBuildError('LogBody: message is required');
    }

    const event = `${this.componentName}.${this.operationName}`;

    // validateRequiredFields() throws if statusValue is undefined; this guard
    // narrows the type for the compiler without a non-null assertion.
    if (this.statusValue === undefined) {
      throw new LogBuildError('LogBody: status is required');
    }

    const result: LogBodyDataType = {
      'context': Object.freeze({ ...this.contextData }),
      'event': event,
      'message': this.messageValue,
      'status': this.statusValue,
      ...(this.durationMs !== undefined && { 'durationMs': this.durationMs })
    };

    return Object.freeze(result);
  }

  /**
   * Set the log message.
   * Required for build().
   */
  message(message: string): this {
    this.messageValue = message;

    return this;
  }
}
