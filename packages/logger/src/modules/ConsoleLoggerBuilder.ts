import type { ConsoleLoggerBuilderInterface } from '../interfaces/ConsoleLoggerBuilderInterface.js';
import type { ConsoleLoggerConfigType } from '../interfaces/ConsoleLoggerConfigType.js';
import type { LoggerInterface } from '../interfaces/LoggerInterface.js';
import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';

/**
 * Fluent builder for configuring ConsoleLogger instances.
 *
 * Enables method chaining for clean, readable logger configuration.
 * Supports log level, timestamp control, prefixes, and metadata.
 * Generic type T represents the ConsoleLogger type to build.
 */
export class ConsoleLoggerBuilder<T extends LoggerInterface>
implements ConsoleLoggerBuilderInterface<T> {
  /**
   * Creates a new ConsoleLoggerBuilder.
   * Use ConsoleLogger.builder() instead of calling this directly.
   *
   * @param factory - Factory function to create ConsoleLogger instances
   * @returns A new ConsoleLoggerBuilder instance
   */
  static create<T extends LoggerInterface>(factory: (c: ConsoleLoggerConfigType) => T): ConsoleLoggerBuilder<T> {
    const result = new ConsoleLoggerBuilder(factory);
    return result;
  }

  readonly #factory: (config: ConsoleLoggerConfigType) => T;

  protected readonly config: ConsoleLoggerConfigType = {
    'includeTimestamp': undefined,
    'level': undefined,
    'metadata': undefined,
    'prefix': undefined
  };

  /**
   * Protected constructor. Use ConsoleLogger.builder() or ConsoleLoggerBuilder.create() to instantiate.
   *
   * @param factory - Factory function to create ConsoleLogger instances
   */
  protected constructor(factory: (config: ConsoleLoggerConfigType) => T) {
    this.#factory = factory;
  }

  /**
   * Constructs the configured logger instance.
   * Calls onBuild() before invoking the factory, allowing subclasses to mutate config.
   *
   * @returns The configured logger instance
   */
  build(): T {
    const finalConfig = this.onBuild(this.config);
    const result = this.#factory(finalConfig);
    return result;
  }

  /**
   * Hook called immediately before the factory is invoked.
   * Override in subclasses to transform or enrich the config.
   * Default implementation returns the config unchanged.
   */
  protected onBuild(_config: ConsoleLoggerConfigType): ConsoleLoggerConfigType {
    return _config;
  }

  /**
   * Controls whether timestamps are included in log output.
   *
   * When enabled, each log entry is prefixed with an ISO 8601 timestamp.
   *
   * @param value - True to include timestamps, false to omit them
   * @returns This builder instance for chaining
   */
  includeTimestamp(value: boolean): this {
    this.config.includeTimestamp = value;

    return this;
  }

  /**
   * Sets the minimum log level for ConsoleLogger.
   *
   * Only messages at or above this level will be logged.
   * Accepts LogLevel enum or string representation.
   *
   * @param level - Log level as enum or string ('trace', 'debug', 'info', 'warn', 'error', 'fatal')
   * @returns This builder instance for chaining
   */
  level(level: LogLevelStringType | LogLevelType): this {
    this.config.level = level;

    return this;
  }

  /**
   * Sets base metadata included in all ConsoleLogger log entries.
   *
   * Metadata is appended to every log message, providing context
   * such as service name, environment, or request IDs.
   * Multiple calls merge metadata instead of replacing.
   *
   * @param metadata - Key-value pairs to include in all logs
   * @returns This builder instance for chaining
   */
  metadata(metadata: LogMetadataType): this {
    this.config.metadata = {
      ...this.config.metadata,
      ...metadata
    };

    return this;
  }

  /**
   * Sets a static prefix for all log messages.
   *
   * The prefix appears at the start of each log entry, useful for
   * identifying log sources or categorizing output.
   *
   * @param prefix - String to prepend to all log messages
   * @returns This builder instance for chaining
   */
  prefix(prefix: string): this {
    this.config.prefix = prefix;

    return this;
  }
}
