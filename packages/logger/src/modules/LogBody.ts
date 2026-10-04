import { SchemaIntakeError } from '@studnicky/entity/browser';
import { ImmutableSnapshot } from '@studnicky/json/browser';

import type { LogBodyDataEntity } from '../entities/LogBodyDataEntity.js';

import { LogBodyConfigEntity } from '../entities/LogBodyConfigEntity.js';
import { LogBuildError } from '../errors/LogBuildError.js';
import { LogBuildErrorMessage } from './LogBuildErrorMessage.js';

/** Constructs immutable normalized log entries from one configuration object. */
export class LogBody {
  private constructor() {}

  static create(config: Readonly<LogBodyConfigEntity.Type>): LogBodyDataEntity.Type {
    try {
      LogBodyConfigEntity.create(config);
    } catch (error) {
      const message = error instanceof SchemaIntakeError ? LogBuildErrorMessage.resolve('LogBody', error) : LogBuildError.toMessage(error);

      throw new LogBuildError(message, error);
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
