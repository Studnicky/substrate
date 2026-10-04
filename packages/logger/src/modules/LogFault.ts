import { SchemaIntakeError } from '@studnicky/entity/browser';
import { ImmutableSnapshot } from '@studnicky/json/browser';

import type { LogFaultDataEntity } from '../entities/LogFaultDataEntity.js';

import { LogFaultConfigEntity } from '../entities/LogFaultConfigEntity.js';
import { LogBuildError } from '../errors/LogBuildError.js';
import { LogBuildErrorMessage } from './LogBuildErrorMessage.js';

/** Constructs immutable normalized fault entries from one configuration object. */
export class LogFault {
  private constructor() {}

  static #throwBuildError(error: unknown): never {
    const message = error instanceof SchemaIntakeError ? LogBuildErrorMessage.resolve('LogFault', error) : LogBuildError.toMessage(error);

    throw new LogBuildError(message, error);
  }

  static create(input: Readonly<LogFaultConfigEntity.InputType>): LogFaultDataEntity.Type {
    let config: LogFaultConfigEntity.Type;
    try {
      config = LogFaultConfigEntity.create(input);
    } catch (error) {
      LogFault.#throwBuildError(error);
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
