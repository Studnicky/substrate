import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';

/**
 * Configuration options for ConsoleLogger
 */
export type ConsoleLoggerConfigType = {
  /**
   * Whether to include timestamps in log messages.
   * Defaults to false.
   */
  'includeTimestamp'?: boolean | undefined;

  /**
   * Minimum log level to output.
   * Logs below this level will be filtered out.
   * Defaults to LogLevel.INFO (never defaults to TRACE or DEBUG).
   */
  'level'?: LogLevelStringType | LogLevelType | undefined;

  /**
   * Metadata to include in all log messages.
   * Example: \{ service: 'api', version: '1.0.0' \}
   */
  'metadata'?: LogMetadataType | undefined;

  /**
   * Prefix to add to all log messages.
   * Example: '[MyApp]'
   */
  'prefix'?: string | undefined;
};
