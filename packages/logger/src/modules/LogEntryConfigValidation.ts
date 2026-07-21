import { LogBuildError } from '../errors/LogBuildError.js';

/** Shared required-field validation for direct log-entry configuration. */
export class LogEntryConfigValidation {
  static requireField<T>(owner: 'LogBody' | 'LogFault', field: string, value: T | undefined): T {
    if (value === undefined) {
      const contextSuffix = field === 'context' ? ' (use empty object {} if no context needed)' : '';
      throw new LogBuildError(`${owner}: ${field} is required${contextSuffix}`);
    }
    return value;
  }
}
