/**
 * Fluent builder for constructing normalized error log entries.
 *
 * LogFault provides a type-safe, fluent API for building error entries
 * that conform to MDN Error conventions and CloudWatch indexable schema.
 *
 * @example
 * ```typescript
 * import { LogFault } from '@studnicky/logger';
 *
 * const fault = LogFault.create()
 *   .component('graph')
 *   .operation('query')
 *   .status('timeout')
 *   .name('TimeoutError')
 *   .message('Query execution exceeded 30s limit')
 *   .context({ query: 'SELECT...' })
 *   .build();
 *
 * logger.error(fault);
 *
 * // From caught error
 * try {
 *   await executeQuery();
 * } catch (err) {
 *   const fault = LogFault.create()
 *     .component('graph')
 *     .operation('query')
 *     .status('failed')
 *     .fromError(err)
 *     .context({})
 *     .build();
 *
 *   logger.error(fault);
 * }
 * ```
 */

import type { LogFaultDataEntity } from '../entities/LogFaultDataEntity.js';
import type { LogFaultInterface } from '../interfaces/LogFaultInterface.js';

import { LogBuildError } from '../errors/LogBuildError.js';
import { BaseLogEntryBuilder } from './BaseLogEntryBuilder.js';

/**
 * Fluent builder for normalized error log entries.
 */
export class LogFault extends BaseLogEntryBuilder implements LogFaultInterface {
  /**
   * Create a new LogFault builder instance.
   *
   * @returns New LogFault builder
   */
  static create(): LogFault {
    const result = new this();
    return result;
  }
  private causeValue: string | undefined;

  private faultMessage: string | undefined;

  private faultName: string | undefined;

  private stackValue: string | undefined;

  /**
   * Protected constructor - use LogFault.create()
   */
  protected constructor() {
    super();
  }

  /**
   * Build and validate the final fault entry.
   * Requires component(), operation(), status(), name(), message(), and context() to have been called.
   *
   * @returns Immutable fault data
   * @throws LogBuildError if required fields are missing
   */
  build(): LogFaultDataEntity.Type {
    this.validateRequiredFields();

    if (this.faultName === undefined) {
      this.invokeHook(() => {
        this.onBuildError('name');
      });
      throw new LogBuildError('LogFault: name is required');
    }

    if (this.faultMessage === undefined) {
      this.invokeHook(() => {
        this.onBuildError('message');
      });
      throw new LogBuildError('LogFault: message is required');
    }

    const event = `${this.componentName}.${this.operationName}`;

    // validateRequiredFields() throws if statusValue is undefined; this guard
    // narrows the type for the compiler without a non-null assertion.
    if (this.statusValue === undefined) {
      this.invokeHook(() => {
        this.onBuildError('status');
      });
      throw new LogBuildError('LogFault: status is required');
    }

    const result: LogFaultDataEntity.Type = {
      'context': Object.freeze({ ...this.contextData }),
      'event': event,
      'message': this.faultMessage,
      'name': this.faultName,
      'status': this.statusValue,
      ...(this.causeValue !== undefined && { 'cause': this.causeValue }),
      ...(this.durationMs !== undefined && { 'durationMs': this.durationMs }),
      ...(this.stackValue !== undefined && { 'stack': this.stackValue })
    };

    this.invokeHook(() => {
      this.onBuild(result);
    });
    return Object.freeze(result);
  }

  /**
   * Set the error cause - the underlying reason for this error.
   */
  cause(cause: Error | string): this {
    if (cause instanceof Error) {
      this.causeValue = cause.message;
    } else {
      this.causeValue = cause;
    }

    return this;
  }

  /**
   * Populate from a caught Error instance.
   * Extracts name, message, cause, and stack from the error.
   * Note: You still need to call status() and context() separately.
   */
  fromError(error: Error): this {
    this.faultName = error.name;
    this.faultMessage = error.message;

    if (error.cause !== undefined) {
      if (error.cause instanceof Error) {
        this.causeValue = error.cause.message;
      } else {
        this.causeValue = String(error.cause);
      }
    }

    if (error.stack !== undefined) {
      this.stackValue = error.stack;
    }

    return this;
  }

  /**
   * Set the error message.
   * Required for build().
   */
  message(message: string): this {
    this.faultMessage = message;

    return this;
  }

  /**
   * Set the error name/type (e.g., 'TypeError', 'ValidationError').
   * Required for build().
   */
  name(name: string): this {
    this.faultName = name;

    return this;
  }

  /**
   * Set the stack trace.
   */
  stack(stack: string): this {
    this.stackValue = stack;

    return this;
  }
}
