import type { LogLevelEntity } from '../entities/LogLevelEntity.js';

import { LOG_LEVEL_MAP } from '../constants/LOG_LEVEL_MAP.js';
import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';

const logLevelDispatch = new Map<unknown, LogLevelEntity.Type>();
for (const [name, value] of Object.entries(LOG_LEVEL_MAP)) {
  logLevelDispatch.set(name, value);
  logLevelDispatch.set(value, value);
}

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
   * ParseLogLevel.parse(LOG_LEVEL.DEBUG); // LOG_LEVEL.DEBUG
   * ParseLogLevel.parse('debug'); // LOG_LEVEL.DEBUG
   * ParseLogLevel.parse('info'); // LOG_LEVEL.INFO
   * ParseLogLevel.parse('unknown'); // LOG_LEVEL.INFO (default)
   * ```
  */
  public static parse(level: unknown): LogLevelEntity.Type {
    return logLevelDispatch.get(level) ?? LOG_LEVEL.INFO;
  }
}
