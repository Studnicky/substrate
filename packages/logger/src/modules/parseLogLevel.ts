import type { LogLevelStringType } from '../types/LogLevelStringType.js';
import type { LogLevelType } from '../types/LogLevelType.js';

import { LOG_LEVEL_MAP } from '../constants/LOG_LEVEL_MAP.js';
import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';

export class ParseLogLevel {
  /**
   * Parses a log level value from either numeric or string format
   *
   * Accepts LOG_LEVEL values directly or string representations.
   * Returns LOG_LEVEL.INFO as default for unrecognized string values.
   *
   * @param level - Log level as numeric value or string representation
   * @returns The corresponding LOG_LEVEL value
   *
   * @example
   * ```typescript
   * LogLevel.parse(LOG_LEVEL.DEBUG); // LOG_LEVEL.DEBUG
   * LogLevel.parse('debug'); // LOG_LEVEL.DEBUG
   * LogLevel.parse('info'); // LOG_LEVEL.INFO
   * LogLevel.parse('unknown'); // LOG_LEVEL.INFO (default)
   * ```
   */
  public static parse(level: LogLevelStringType | LogLevelType): LogLevelType {
    if (typeof level === 'number') {
      return level;
    }

    return (LOG_LEVEL_MAP as Record<string, LogLevelType | undefined>)[level] ?? LOG_LEVEL.INFO;
  }
}
