import { SchemaIntakeError } from '@studnicky/entity/browser';
import { ImmutableSnapshot } from '@studnicky/json/browser';

import type { LogFaultDataEntity } from '../entities/LogFaultDataEntity.js';

import { LogFaultConfigEntity } from '../entities/LogFaultConfigEntity.js';
import { LogBuildError } from '../errors/LogBuildError.js';

/** Constructs immutable normalized fault entries from one configuration object. */
export class LogFault {
  private constructor() {}

  static #resolveErrorMessage(error: SchemaIntakeError): string {
    const requiredError = error.errors.find((item) => {
      const result = item.keyword === 'required';
      return result;
    });
    const missingProperty: unknown = requiredError === undefined
      ? undefined
      : Reflect.get(requiredError.parameters, 'missingProperty');
    const message = typeof missingProperty !== 'string'
      ? error.message
      : `LogFault: ${missingProperty} is required${missingProperty === 'context' ? ' (use empty object {} if no context needed)' : ''}`;
    return message;
  }

  static #throwBuildError(error: unknown): never {
    if (error instanceof SchemaIntakeError) {
      const message = LogFault.#resolveErrorMessage(error);
      throw new LogBuildError(message);
    }
    throw error;
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
