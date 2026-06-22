import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';
import type { LoggerBuilderInterface } from './LoggerBuilderInterface.js';
import type { LoggerInterface } from './LoggerInterface.js';

/**
 * Interface for ConsoleLogger builder methods.
 *
 * Defines the fluent API contract for configuring ConsoleLogger instances.
 * Extends the base LoggerBuilderInterface for the common build() method.
 */
export interface ConsoleLoggerBuilderInterface<T extends LoggerInterface>
  extends LoggerBuilderInterface<T> {
  includeTimestamp(value: boolean): this;
  level(level: LogLevelStringType | LogLevelType): this;
  metadata(metadata: LogMetadataType): this;
  prefix(prefix: string): this;
}
