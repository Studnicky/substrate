import type { LogBodyDataType } from '../interfaces/LogBodyDataType.js';
import type { LogFaultDataType } from '../interfaces/LogFaultDataType.js';
import type { LogStatusType } from '../types/LogStatusType.js';

import { LogBuildError } from '../errors/LogBuildError.js';

/**
 * Base class for log entry builders providing shared fluent API methods.
 */
export abstract class BaseLogEntryBuilder {
  protected constructor() {}

  protected componentName: string | undefined;
  protected contextCalled = false;
  protected readonly contextData: Record<string, unknown> = {};
  protected durationMs: number | undefined;
  protected operationName: string | undefined;
  protected statusValue: LogStatusType | undefined;

  /**
   * Build and return the final log entry data.
   * Subclasses must implement with a narrowed return type.
   */
  abstract build(): LogBodyDataType | LogFaultDataType;

  /**
   * Set the component name (e.g., 'graph', 'cache', 'api').
   * Required for build().
   */
  component(name: string): this {
    this.componentName = name;
    this.onFieldSet('component', name);

    return this;
  }

  /**
   * Add contextual data.
   * Required for build() - use empty object if no context needed.
   * Context data is nested under a 'context' key in the output.
   */
  context(data: Record<string, unknown>): this {
    this.contextCalled = true;
    Object.assign(this.contextData, data);
    this.onFieldSet('context', data);

    return this;
  }

  /**
   * Set the operation duration.
   */
  duration(ms: number): this {
    this.durationMs = ms;
    this.onFieldSet('duration', ms);

    return this;
  }

  /**
   * Set the operation name (e.g., 'query', 'get', 'response').
   * Required for build().
   */
  operation(name: string): this {
    this.operationName = name;
    this.onFieldSet('operation', name);

    return this;
  }

  /**
   * Set the operation status.
   * Required for build().
   */
  status(status: LogStatusType): this {
    this.statusValue = status;
    this.onFieldSet('status', status);

    return this;
  }

  /**
   * Hook called after each field is set via the fluent API.
   * Override in subclasses to observe field mutations.
   * Default implementation is a no-op.
   */
  protected onFieldSet(_field: string, _value: unknown): void {}

  /**
   * Hook called after `build()` assembles the frozen result.
   * Override in subclasses to observe completed build results.
   * Default implementation is a no-op.
   */
  protected onBuild(_result: LogBodyDataType | LogFaultDataType): void {}

  /**
   * Hook called when a required field is missing and `build()` is about to throw.
   * Override in subclasses to observe build errors before they are thrown.
   * Default implementation is a no-op.
   */
  protected onBuildError(_field: string): void {}

  /**
   * Validates the fields shared by all log entry builders.
   * Throws LogBuildError if component, operation, status, or context are missing.
   * Subclasses call this and then validate their own additional required fields.
   */
  protected validateRequiredFields(): void {
    if (this.componentName === undefined) {
      this.onBuildError('component');
      throw new LogBuildError(`${this.constructor.name}: component is required`);
    }

    if (this.operationName === undefined) {
      this.onBuildError('operation');
      throw new LogBuildError(`${this.constructor.name}: operation is required`);
    }

    if (this.statusValue === undefined) {
      this.onBuildError('status');
      throw new LogBuildError(`${this.constructor.name}: status is required`);
    }

    if (!this.contextCalled) {
      this.onBuildError('context');
      throw new LogBuildError(`${this.constructor.name}: context is required (use empty object {} if no context needed)`);
    }
  }
}
