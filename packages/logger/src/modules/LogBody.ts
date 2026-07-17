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

import type { LogBodyDataEntity } from '../entities/LogBodyDataEntity.js';
import type { LogBodyInterface } from '../interfaces/LogBodyInterface.js';

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
  build(): LogBodyDataEntity.Type {
    this.validateRequiredFields();

    const message = this.requireField(this.messageValue, 'message');
    const status = this.requireField(this.statusValue, 'status');
    const event = `${this.componentName}.${this.operationName}`;

    const result: LogBodyDataEntity.Type = {
      'context': Object.freeze({ ...this.contextData }),
      'event': event,
      'message': message,
      'status': status,
      ...(this.durationMs !== undefined && { 'durationMs': this.durationMs })
    };

    this.hooks.invoke('onBuild', () => {
      const hookResult = this.onBuild(result);
      return hookResult;
    });
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
