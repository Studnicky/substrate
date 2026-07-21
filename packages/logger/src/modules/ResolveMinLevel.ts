import type { LogLevelEntity } from '../entities/LogLevelEntity.js';
import type { LogLevelOptionsInterface } from '../interfaces/LogLevelOptionsInterface.js';

import { LOG_LEVEL } from '../constants/LOG_LEVEL.js';
import { ConfigurationError } from '../errors/ConfigurationError.js';
import { ParseLogLevel } from './parseLogLevel.js';

export class ResolveMinLevel {
  /**
   * Validates and resolves a transport's minimum log level from constructor options.
   *
   * @param options - Options containing an optional `level`
   * @returns The resolved LOG_LEVEL value, defaulting to LOG_LEVEL.TRACE
   * @throws ConfigurationError if `level` is neither a string nor a number
   */
  public static from(options: LogLevelOptionsInterface): LogLevelEntity.Type {
    if (options.level !== undefined
      && typeof options.level !== 'string'
      && typeof options.level !== 'number') {
      throw new ConfigurationError('level must be a string or number');
    }

    return options.level !== undefined
      ? ParseLogLevel.parse(options.level)
      : LOG_LEVEL.TRACE;
  }
}
