import type { LoggerInterface } from '../interfaces/LoggerInterface.js';
import type { PinoLoggerBuilderInterface } from '../interfaces/PinoLoggerBuilderInterface.js';
import type { PinoLoggerConfigType } from '../interfaces/PinoLoggerConfigType.js';
import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';

/**
 * Fluent builder for configuring PinoLogger instances.
 *
 * Enables method chaining for clean, readable logger configuration.
 * Supports log level, pretty printing, file destinations, and metadata.
 * Generic type T represents the PinoLogger type to build.
 */
export class PinoLoggerBuilder<T extends LoggerInterface>
implements PinoLoggerBuilderInterface<T> {
  /**
   * Creates a new PinoLoggerBuilder.
   * Use PinoLogger.builder() instead of calling this directly.
   *
   * @param factory - Factory function to create PinoLogger instances
   * @returns A new PinoLoggerBuilder instance
   */
  static create<T extends LoggerInterface>(factory: (config: PinoLoggerConfigType) => T): PinoLoggerBuilder<T> {
    const result = new PinoLoggerBuilder(factory);
    return result;
  }

  readonly #factory: (config: PinoLoggerConfigType) => T;

  protected readonly config: PinoLoggerConfigType;

  /**
   * Protected constructor. Use PinoLogger.builder() or PinoLoggerBuilder.create() to instantiate.
   *
   * @param factory - Factory function to create PinoLogger instances
   */
  protected constructor(factory: (config: PinoLoggerConfigType) => T) {
    this.#factory = factory;

    this.config = {
      'destination': undefined,
      'enabled': undefined,
      'errorKey': undefined,
      'formatters': undefined,
      'level': undefined,
      'messageKey': undefined,
      'metadata': undefined,
      'mixin': undefined,
      'name': undefined,
      'nestedKey': undefined,
      'pretty': undefined,
      'redact': undefined,
      'safe': undefined,
      'serializers': undefined,
      'timestamp': undefined
    };
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
  protected onBuild(_config: PinoLoggerConfigType): PinoLoggerConfigType {
    return _config;
  }

  /**
   * Sets the file path for log output.
   *
   * Configures Pino to write logs to a file instead of stdout.
   * Creates parent directories if they do not exist.
   *
   * @param path - Absolute or relative file path for log output
   * @returns This builder instance for chaining
   */
  destination(path: string): this {
    this.config.destination = path;

    return this;
  }

  /**
   * Enables or disables logging.
   *
   * @param value - True to enable logging (default: true)
   * @returns This builder instance for chaining
   */
  enabled(value: boolean): this {
    this.config.enabled = value;

    return this;
  }

  /**
   * Sets the error key in JSON output.
   *
   * @param key - The key name for errors (default: 'err')
   * @returns This builder instance for chaining
   */
  errorKey(key: string): this {
    this.config.errorKey = key;

    return this;
  }

  /**
   * Sets formatters for level and log objects.
   *
   * @param value - Formatter functions for level and log
   * @returns This builder instance for chaining
   */
  formatters(value: {
    'level'?: (label: string, number: number) => object;
    'log'?: (object: Record<string, unknown>) => Record<string, unknown>;
  }): this {
    this.config.formatters = value;

    return this;
  }

  /**
   * Sets the minimum log level.
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
   * Sets the message key in JSON output.
   *
   * @param key - The key name for log messages (default: 'msg')
   * @returns This builder instance for chaining
   */
  messageKey(key: string): this {
    this.config.messageKey = key;

    return this;
  }

  /**
   * Sets base metadata included in all log entries.
   *
   * Metadata is merged into every log message, providing context
   * such as service name, environment, or request IDs.
   *
   * @param metadata - Key-value pairs to include in all logs
   * @returns This builder instance for chaining
   */
  metadata(metadata: LogMetadataType): this {
    this.config.metadata = metadata;

    return this;
  }

  /**
   * Sets a mixin function to add dynamic properties to logs.
   *
   * @param value - Function that returns object to merge into logs
   * @returns This builder instance for chaining
   */
  mixin(value: () => object): this {
    this.config.mixin = value;

    return this;
  }

  /**
   * Sets the name of the logger.
   *
   * @param value - The logger name
   * @returns This builder instance for chaining
   */
  name(value: string): this {
    this.config.name = value;

    return this;
  }

  /**
   * Sets the nested key for logged objects.
   *
   * @param key - The key to nest objects under
   * @returns This builder instance for chaining
   */
  nestedKey(key: string): this {
    this.config.nestedKey = key;

    return this;
  }

  /**
   * Enables or disables pretty-printed log output.
   *
   * Pretty printing formats logs for human readability in development.
   * Uses pino-pretty for colorized, formatted output.
   *
   * @param enabled - True for pretty output, false for JSON (default: false)
   * @returns This builder instance for chaining
   */
  pretty(enabled: boolean): this {
    this.config.pretty = enabled;

    return this;
  }

  /**
   * Sets paths to redact from log output.
   *
   * @param value - Array of paths or redact options object
   * @returns This builder instance for chaining
   */
  redact(value: string[] | { 'censor'?: string;
    'paths': string[];
    'remove'?: boolean }): this {
    this.config.redact = value;

    return this;
  }

  /**
   * Enables or disables circular reference protection.
   *
   * @param value - True to avoid circular reference errors (default: true)
   * @returns This builder instance for chaining
   */
  safe(value: boolean): this {
    this.config.safe = value;

    return this;
  }

  /**
   * Sets custom serializers for objects.
   *
   * @param value - Object containing serializer functions
   * @returns This builder instance for chaining
   */
  serializers(value: Record<string, (value: unknown) => unknown>): this {
    this.config.serializers = value;

    return this;
  }

  /**
   * Enables or disables timestamp in log messages.
   *
   * @param value - True to enable, false to disable, or a function returning timestamp string
   * @returns This builder instance for chaining
   */
  timestamp(value: (() => string) | boolean): this {
    this.config.timestamp = value;

    return this;
  }
}
