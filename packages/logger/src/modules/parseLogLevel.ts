import type { LogLevelEntity } from '../entities/LogLevelEntity.js';

import { LOG_LEVEL_MAP } from '../constants/LOG_LEVEL_MAP.js';
import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';

const logLevelDispatch = new Map<string | number, LogLevelEntity.Type>();
const logLevelEntries = Object.entries(LOG_LEVEL_MAP);
const length = logLevelEntries.length;
for (let index = 0; index < length; index += 1) {
  const entry = logLevelEntries[index];
  if (entry === undefined) { continue; }
  const [name, value] = entry;
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
  public static parse(level: string | number): LogLevelEntity.Type {
    const result = logLevelDispatch.get(level) ?? LOG_LEVEL.INFO;
    return result;
  }
}
