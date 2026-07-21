import type { LogFaultConfigEntity } from '../entities/LogFaultConfigEntity.js';
import type { LogFaultDataEntity } from '../entities/LogFaultDataEntity.js';

import { ImmutableSnapshot } from './ImmutableSnapshot.js';
import { LogEntryConfigValidation } from './LogEntryConfigValidation.js';

/** Constructs immutable normalized fault entries from one configuration object. */
export class LogFault {
  private constructor() {}

  static create(config: Readonly<LogFaultConfigEntity.Type>): LogFaultDataEntity.Type {
    const component = LogEntryConfigValidation.requireField('LogFault', 'component', config.component);
    const operation = LogEntryConfigValidation.requireField('LogFault', 'operation', config.operation);
    const status = LogEntryConfigValidation.requireField('LogFault', 'status', config.status);
    const context = LogEntryConfigValidation.requireField('LogFault', 'context', config.context);
    const name = LogEntryConfigValidation.requireField('LogFault', 'name', config.name);
    const message = LogEntryConfigValidation.requireField('LogFault', 'message', config.message);

    const result: LogFaultDataEntity.Type = {
      'context': context,
      'event': `${component}.${operation}`,
      'message': message,
      'name': name,
      'status': status,
      ...(config.cause !== undefined && { 'cause': config.cause }),
      ...(config.durationMs !== undefined && { 'durationMs': config.durationMs }),
      ...(config.stack !== undefined && { 'stack': config.stack })
    };

    return ImmutableSnapshot.from(result);
  }
}
