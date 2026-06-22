import type { LogStatusType } from '../types/LogStatusType.js';

/**
 * Interface for base log entry builder providing shared fluent API methods.
 */
export interface BaseLogEntryBuilderInterface {
  /**
   * Set the component name (e.g., 'graph', 'cache', 'api').
   */
  component(name: string): this;

  /**
   * Add contextual data.
   */
  context(data: Record<string, unknown>): this;

  /**
   * Set the operation duration.
   */
  duration(ms: number): this;

  /**
   * Set the operation name (e.g., 'query', 'get', 'response').
   */
  operation(name: string): this;

  /**
   * Set the operation status.
   */
  status(status: LogStatusType): this;
}
