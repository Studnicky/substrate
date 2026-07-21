import type { LogBodyConfigEntity } from '../entities/LogBodyConfigEntity.js';
import type { LogBodyDataEntity } from '../entities/LogBodyDataEntity.js';

import { ImmutableSnapshot } from './ImmutableSnapshot.js';
import { LogEntryConfigValidation } from './LogEntryConfigValidation.js';

/** Constructs immutable normalized log entries from one configuration object. */
export class LogBody {
  private constructor() {}

  static create(config: Readonly<LogBodyConfigEntity.Type>): LogBodyDataEntity.Type {
    const component = LogEntryConfigValidation.requireField('LogBody', 'component', config.component);
    const operation = LogEntryConfigValidation.requireField('LogBody', 'operation', config.operation);
    const status = LogEntryConfigValidation.requireField('LogBody', 'status', config.status);
    const context = LogEntryConfigValidation.requireField('LogBody', 'context', config.context);
    const message = LogEntryConfigValidation.requireField('LogBody', 'message', config.message);

    const result: LogBodyDataEntity.Type = {
      'context': context,
      'event': `${component}.${operation}`,
      'message': message,
      'status': status,
      ...(config.durationMs !== undefined && { 'durationMs': config.durationMs })
    };

    return ImmutableSnapshot.from(result);
  }
}
