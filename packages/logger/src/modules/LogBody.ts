import { SchemaIntakeError } from '@studnicky/json';

import type { LogBodyDataEntity } from '../entities/LogBodyDataEntity.js';

import { LogBodyConfigEntity } from '../entities/LogBodyConfigEntity.js';
import { LogBuildError } from '../errors/LogBuildError.js';
import { ImmutableSnapshot } from './ImmutableSnapshot.js';

/** Constructs immutable normalized log entries from one configuration object. */
export class LogBody {
  private constructor() {}

  static create(config: Readonly<LogBodyConfigEntity.Type>): LogBodyDataEntity.Type {
    try {
      LogBodyConfigEntity.create(config);
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
          : `LogBody: ${missingProperty} is required${missingProperty === 'context' ? ' (use empty object {} if no context needed)' : ''}`;
        throw new LogBuildError(message);
      }
      throw error;
    }
    const result: LogBodyDataEntity.Type = {
      'context': config.context,
      'event': `${config.component}.${config.operation}`,
      'message': config.message,
      'status': config.status,
      ...(config.durationMs !== undefined && { 'durationMs': config.durationMs })
    };

    const snapshot = ImmutableSnapshot.from(result);
    return snapshot;
  }
}
