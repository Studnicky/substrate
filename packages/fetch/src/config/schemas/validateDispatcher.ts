/**
 * Dispatcher configuration validation
 */

import {
  MAXIMUM_DISPATCHER_CONNECTIONS, MAXIMUM_PIPELINING
} from '../../constants/index.js';
import { ConfigurationError } from '../../errors/index.js';

/**
 * Internal dispatcher property validators.
 */
class DispatcherValidator {
  /**
   * Validates a boolean property
   */
  static boolean(value: unknown, path: string): void {
    if (typeof value !== 'boolean') {
      throw new ConfigurationError(`${path} must be a boolean`);
    }
  }

  /**
   * Validates a required number is non-negative and finite
   */
  static nonNegativeNumber(value: unknown, path: string): void {
    if (typeof value !== 'number') {
      throw new ConfigurationError(`${path} must be a number`);
    }
    if (value < 0) {
      throw new ConfigurationError(`${path} must be non-negative`);
    }
    if (!Number.isFinite(value)) {
      throw new ConfigurationError(`${path} must be finite`);
    }
  }

  /**
   * Validates an optional number is non-negative and finite when present
   */
  static optionalNonNegativeNumber(value: unknown, path: string): void {
    if (value === undefined || value === null) {
      return;
    }
    DispatcherValidator.nonNegativeNumber(value, path);
  }

  /**
   * Validates a required positive integer with max constraint
   */
  static positiveIntegerWithMaximum(value: unknown, path: string, maximum: number): void {
    if (typeof value !== 'number') {
      throw new ConfigurationError(`${path} must be a number`);
    }
    if (value < 1) {
      throw new ConfigurationError(`${path} must be at least 1`);
    }
    if (value > maximum) {
      throw new ConfigurationError(`${path} must not exceed ${maximum}`);
    }
    if (!Number.isInteger(value)) {
      throw new ConfigurationError(`${path} must be an integer`);
    }
  }

  /**
   * Validates connections value (null for unlimited, or positive integer with max)
   */
  static connections(value: unknown, path: string): void {
    if (value === undefined || value === null) {
      return;
    }
    DispatcherValidator.positiveIntegerWithMaximum(value, path, MAXIMUM_DISPATCHER_CONNECTIONS);
  }

  /**
   * Validates a required positive integer (no max constraint)
   */
  static positiveInteger(value: unknown, path: string): void {
    if (typeof value !== 'number') {
      throw new ConfigurationError(`${path} must be a number`);
    }
    if (value < 1) {
      throw new ConfigurationError(`${path} must be at least 1`);
    }
    if (!Number.isInteger(value)) {
      throw new ConfigurationError(`${path} must be an integer`);
    }
  }

  /**
   * Validates an optional positive integer
   */
  static optionalPositiveInteger(value: unknown, path: string): void {
    if (value === undefined || value === null) {
      return;
    }
    DispatcherValidator.positiveInteger(value, path);
  }

  /**
   * Validates an optional non-empty string
   */
  static optionalNonEmptyString(value: unknown, path: string): void {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value !== 'string') {
      throw new ConfigurationError(`${path} must be a string`);
    }
    if (value.length === 0) {
      throw new ConfigurationError(`${path} must not be empty`);
    }
  }

  /**
   * Validates pipelining value (integer 0-10)
   */
  static pipelining(value: unknown, path: string): void {
    if (typeof value !== 'number') {
      throw new ConfigurationError(`${path} must be a number`);
    }
    if (value < 0) {
      throw new ConfigurationError(`${path} must be non-negative`);
    }
    if (value > MAXIMUM_PIPELINING) {
      throw new ConfigurationError(`${path} must not exceed ${MAXIMUM_PIPELINING}`);
    }
    if (!Number.isInteger(value)) {
      throw new ConfigurationError(`${path} must be an integer`);
    }
  }

  /**
   * Validates maximumResponseSize (-1 for unlimited or positive integer)
   */
  static maximumResponseSize(value: unknown, path: string): void {
    if (typeof value !== 'number') {
      throw new ConfigurationError(`${path} must be a number`);
    }
    if (value !== -1 && value < 0) {
      throw new ConfigurationError(`${path} must be -1 (unlimited) or positive`);
    }
    if (!Number.isInteger(value)) {
      throw new ConfigurationError(`${path} must be an integer`);
    }
  }

  /**
   * Validates dispatcher configuration object
   * @param value - Dispatcher configuration to validate
   * @throws ConfigurationError if validation fails
   */
  static validate(value: unknown): void {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ConfigurationError('dispatcher must be an object');
    }

    const propertyNames = Object.keys(value);
    const propertyNameLength = propertyNames.length;
    for (let index = 0; index < propertyNameLength; index += 1) {
      const key = propertyNames[index];
      if (key === undefined) {
        continue;
      }
      const propertyValue: unknown = Reflect.get(value, key);
      const validatorEntry = VALIDATORS.get(key);

      if (validatorEntry === undefined) {
        throw new ConfigurationError(`"dispatcher.${key}" is not declared in the schema`);
      }
      const [validator, path] = validatorEntry;
      validator(propertyValue, path);
    }
  }
}

/**
 * Dispatcher property validators dispatch map
 */
const VALIDATORS = new Map<string, readonly [(value: unknown, path: string) => void, string]>([
  ['allowH2', [DispatcherValidator.boolean, 'dispatcher.allowH2']],
  ['autoSelectFamily', [DispatcherValidator.boolean, 'dispatcher.autoSelectFamily']],
  ['autoSelectFamilyAttemptTimeout', [DispatcherValidator.nonNegativeNumber, 'dispatcher.autoSelectFamilyAttemptTimeout']],
  ['bodyTimeout', [DispatcherValidator.nonNegativeNumber, 'dispatcher.bodyTimeout']],
  ['clientTtl', [DispatcherValidator.optionalNonNegativeNumber, 'dispatcher.clientTtl']],
  ['connections', [DispatcherValidator.connections, 'dispatcher.connections']],
  ['connectTimeout', [DispatcherValidator.nonNegativeNumber, 'dispatcher.connectTimeout']],
  ['enabled', [DispatcherValidator.boolean, 'dispatcher.enabled']],
  ['headersTimeout', [DispatcherValidator.nonNegativeNumber, 'dispatcher.headersTimeout']],
  ['keepAliveMaximumTimeout', [DispatcherValidator.nonNegativeNumber, 'dispatcher.keepAliveMaximumTimeout']],
  ['keepAliveTimeout', [DispatcherValidator.nonNegativeNumber, 'dispatcher.keepAliveTimeout']],
  ['keepAliveTimeoutThreshold', [DispatcherValidator.nonNegativeNumber, 'dispatcher.keepAliveTimeoutThreshold']],
  ['localAddress', [DispatcherValidator.optionalNonEmptyString, 'dispatcher.localAddress']],
  ['maximumConcurrentStreams', [DispatcherValidator.positiveInteger, 'dispatcher.maximumConcurrentStreams']],
  ['maximumHeaderSize', [DispatcherValidator.positiveInteger, 'dispatcher.maximumHeaderSize']],
  ['maximumOrigins', [DispatcherValidator.optionalPositiveInteger, 'dispatcher.maximumOrigins']],
  ['maximumRequestsPerClient', [DispatcherValidator.optionalPositiveInteger, 'dispatcher.maximumRequestsPerClient']],
  ['maximumResponseSize', [DispatcherValidator.maximumResponseSize, 'dispatcher.maximumResponseSize']],
  ['pipelining', [DispatcherValidator.pipelining, 'dispatcher.pipelining']],
  ['strictContentLength', [DispatcherValidator.boolean, 'dispatcher.strictContentLength']]
]);

export const validateDispatcher: (value: unknown) => void = DispatcherValidator.validate;
