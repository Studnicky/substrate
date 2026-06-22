import type pino from 'pino';

import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';
import type { LogMetadataType } from '../types/LogMetadataType.js';

/**
 * Configuration options for PinoLogger
 */
export type PinoLoggerConfigType = {
  /**
   * File destination for logs.
   * Example: '/var/log/app.log'
   */
  'destination'?: string | undefined;

  /**
   * Enables or disables logging.
   * Defaults to true.
   */
  'enabled'?: boolean | undefined;

  /**
   * The string key for the 'error' in the JSON object.
   * Defaults to 'err'.
   */
  'errorKey'?: string | undefined;

  /**
   * Formatters for level and log objects.
   */
  'formatters'?: undefined | {
    'level'?: (label: string, number: number) => object;
    'log'?: (object: Record<string, unknown>) => Record<string, unknown>;
  };

  /**
   * Minimum log level to output.
   * Defaults to LogLevel.INFO (never defaults to TRACE or DEBUG).
   */
  'level'?: LogLevelStringType | LogLevelType | undefined;

  /**
   * The string key for the 'message' in the JSON object.
   * Defaults to 'msg'.
   */
  'messageKey'?: string | undefined;

  /**
   * Metadata to include in all log messages.
   * Example: \{ service: 'api', version: '1.0.0' \}
   */
  'metadata'?: LogMetadataType | undefined;

  /**
   * Function called each time a logging method is called.
   * The returned object properties will be added to the logged JSON.
   */
  'mixin'?: (() => object) | undefined;

  /**
   * The name of the logger.
   * Example: 'my-application'
   */
  'name'?: string | undefined;

  /**
   * The string key to place any logged object under.
   */
  'nestedKey'?: string | undefined;

  /**
   * Enable pretty printing for human-readable logs.
   * Defaults to true when NODE_ENV !== 'production', false otherwise.
   */
  'pretty'?: boolean | undefined;

  /**
   * Redact sensitive paths from log output.
   * Example: ['password', 'creditCard'] or \{ paths: ['password'], censor: '[REDACTED]' \}
   */
  'redact'?: pino.redactOptions | string[] | undefined;

  /**
   * Avoid error causes by circular references in the object tree.
   * Defaults to true.
   */
  'safe'?: boolean | undefined;

  /**
   * Custom serializers for objects.
   * Example: \{ err: pino.stdSerializers.err \}
   */
  'serializers'?: Record<string, (value: unknown) => unknown> | undefined;

  /**
   * Enables or disables timestamp in log messages.
   * Defaults to true.
   */
  'timestamp'?: (() => string) | boolean | undefined;
};
