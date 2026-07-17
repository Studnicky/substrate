import { HookInvoker } from '@studnicky/errors';

import type { LogBodyDataEntity } from '../entities/LogBodyDataEntity.js';
import type { LogFaultDataEntity } from '../entities/LogFaultDataEntity.js';
import type { LogStatusType } from '../types/LogStatusType.js';

import { LogBuildError } from '../errors/LogBuildError.js';

/**
 * Base class for log entry builders providing shared fluent API methods.
 */
export abstract class BaseLogEntryBuilder {
  protected constructor() {}

  protected readonly hooks: HookInvoker = new HookInvoker();

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
  abstract build(): LogBodyDataEntity.Type | LogFaultDataEntity.Type;

  /**
   * Set the component name (e.g., 'graph', 'cache', 'api').
   * Required for build().
   */
  component(name: string): this {
    this.componentName = name;
    this.hooks.invoke('onFieldSet', () => {
      const result = this.onFieldSet('component', name);
      return result;
    });

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
    this.hooks.invoke('onFieldSet', () => {
      const result = this.onFieldSet('context', data);
      return result;
    });

    return this;
  }

  /**
   * Set the operation duration.
   */
  duration(ms: number): this {
    this.durationMs = ms;
    this.hooks.invoke('onFieldSet', () => {
      const result = this.onFieldSet('duration', ms);
      return result;
    });

    return this;
  }

  /**
   * Set the operation name (e.g., 'query', 'get', 'response').
   * Required for build().
   */
  operation(name: string): this {
    this.operationName = name;
    this.hooks.invoke('onFieldSet', () => {
      const result = this.onFieldSet('operation', name);
      return result;
    });

    return this;
  }

  /**
   * Set the operation status.
   * Required for build().
   */
  status(status: LogStatusType): this {
    this.statusValue = status;
    this.hooks.invoke('onFieldSet', () => {
      const result = this.onFieldSet('status', status);
      return result;
    });

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
  protected onBuild(_result: LogBodyDataEntity.Type | LogFaultDataEntity.Type): void {}

  /**
   * Hook called when a required field is missing and `build()` is about to throw.
   * Override in subclasses to observe build errors before they are thrown.
   * Default implementation is a no-op.
   */
  protected onBuildError(_field: string): void {}

  /**
   * Asserts that a required field was set, invoking the build-error hook and
   * throwing LogBuildError if it was not. Returns the narrowed non-undefined value.
   */
  protected requireField<T>(value: T | undefined, fieldName: string): T {
    if (value === undefined) {
      this.hooks.invoke('onBuildError', () => {
        const result = this.onBuildError(fieldName);
        return result;
      });
      throw new LogBuildError(`${this.constructor.name}: ${fieldName} is required`);
    }

    return value;
  }

  /**
   * Validates the fields shared by all log entry builders.
   * Throws LogBuildError if component, operation, status, or context are missing.
   * Subclasses call this and then validate their own additional required fields.
   */
  protected validateRequiredFields(): void {
    this.requireField(this.componentName, 'component');
    this.requireField(this.operationName, 'operation');
    this.requireField(this.statusValue, 'status');

    if (!this.contextCalled) {
      this.hooks.invoke('onBuildError', () => {
        const result = this.onBuildError('context');
        return result;
      });
      throw new LogBuildError(`${this.constructor.name}: context is required (use empty object {} if no context needed)`);
    }
  }
}
