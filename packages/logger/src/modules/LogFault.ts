import { SchemaIntakeError } from '@studnicky/json';

import type { LogFaultDataEntity } from '../entities/LogFaultDataEntity.js';

import { LogFaultConfigEntity } from '../entities/LogFaultConfigEntity.js';
import { LogBuildError } from '../errors/LogBuildError.js';
import { ImmutableSnapshot } from './ImmutableSnapshot.js';

/** Constructs immutable normalized fault entries from one configuration object. */
export class LogFault {
  private constructor() {}

  static create(config: Readonly<LogFaultConfigEntity.Type>): LogFaultDataEntity.Type {
    try {
      LogFaultConfigEntity.create(config);
    } catch (error) {
      if (error instanceof SchemaIntakeError) {
        const requiredError = error.errors.find((item) => {
          const result = item.keyword === 'required';
          return result;
        });
        const missingProperty: unknown = requiredError === undefined
          ? undefined
          : Reflect.get(requiredError.params, 'missingProperty');
        const message = typeof missingProperty !== 'string'
          ? error.message
          : `LogFault: ${missingProperty} is required${missingProperty === 'context' ? ' (use empty object {} if no context needed)' : ''}`;
        throw new LogBuildError(message);
      }
      throw error;
    }
    const result: LogFaultDataEntity.Type = {
      'context': config.context,
      'event': `${config.component}.${config.operation}`,
      'message': config.message,
      'name': config.name,
      'status': config.status,
      ...(config.cause !== undefined && { 'cause': config.cause }),
      ...(config.durationMs !== undefined && { 'durationMs': config.durationMs }),
      ...(config.stack !== undefined && { 'stack': config.stack })
    };

    const snapshot = ImmutableSnapshot.from(result);
    return snapshot;
  }
}
