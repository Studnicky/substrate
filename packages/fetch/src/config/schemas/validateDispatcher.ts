/**
 * Dispatcher configuration validation
 */

import type { ValidatorFnType } from '../../types/ValidatorFnType.js';

import {
  MAX_DISPATCHER_CONNECTIONS, MAX_PIPELINING
} from '../../constants/index.js';
import { ConfigurationError } from '../../errors/index.js';

/**
 * Validates a boolean property
 */
function validateBoolean(value: unknown, path: string): void {
  if (typeof value !== 'boolean') {
    throw new ConfigurationError(`${path} must be a boolean`);
  }
}

/**
 * Validates a required number is non-negative and finite
 */
function validateNonNegativeNumber(value: unknown, path: string): void {
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
function validateOptionalNonNegativeNumber(value: unknown, path: string): void {
  if (value === undefined || value === null) {
    return;
  }
  validateNonNegativeNumber(value, path);
}

/**
 * Validates a required positive integer with max constraint
 */
function validatePositiveIntegerWithMax(value: unknown, path: string, max: number): void {
  if (typeof value !== 'number') {
    throw new ConfigurationError(`${path} must be a number`);
  }
  if (value < 1) {
    throw new ConfigurationError(`${path} must be at least 1`);
  }
  if (value > max) {
    throw new ConfigurationError(`${path} must not exceed ${max}`);
  }
  if (!Number.isInteger(value)) {
    throw new ConfigurationError(`${path} must be an integer`);
  }
}

/**
 * Validates connections value (null for unlimited, or positive integer with max)
 */
function validateConnections(value: unknown, path: string): void {
  if (value === undefined || value === null) {
    return;
  }
  validatePositiveIntegerWithMax(value, path, MAX_DISPATCHER_CONNECTIONS);
}

/**
 * Validates a required positive integer (no max constraint)
 */
function validatePositiveInteger(value: unknown, path: string): void {
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
function validateOptionalPositiveInteger(value: unknown, path: string): void {
  if (value === undefined || value === null) {
    return;
  }
  validatePositiveInteger(value, path);
}

/**
 * Validates an optional non-empty string
 */
function validateOptionalNonEmptyString(value: unknown, path: string): void {
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
function validatePipelining(value: unknown, path: string): void {
  if (typeof value !== 'number') {
    throw new ConfigurationError(`${path} must be a number`);
  }
  if (value < 0) {
    throw new ConfigurationError(`${path} must be non-negative`);
  }
  if (value > MAX_PIPELINING) {
    throw new ConfigurationError(`${path} must not exceed ${MAX_PIPELINING}`);
  }
  if (!Number.isInteger(value)) {
    throw new ConfigurationError(`${path} must be an integer`);
  }
}

/**
 * Validates maxResponseSize (-1 for unlimited or positive integer)
 */
function validateMaxResponseSize(value: unknown, path: string): void {
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
 * Dispatcher property validators dispatch map
 */
const VALIDATORS: Record<string, ValidatorFnType> = {
  'allowH2': (value: unknown) => {
    const result = validateBoolean(value, 'dispatcher.allowH2');
    return result;
  },
  'autoSelectFamily': (value: unknown) => {
    const result = validateBoolean(value, 'dispatcher.autoSelectFamily');
    return result;
  },
  'autoSelectFamilyAttemptTimeout': (value: unknown) => {
    const result = validateNonNegativeNumber(value, 'dispatcher.autoSelectFamilyAttemptTimeout');
    return result;
  },
  'bodyTimeout': (value: unknown) => {
    const result = validateNonNegativeNumber(value, 'dispatcher.bodyTimeout');
    return result;
  },
  'clientTtl': (value: unknown) => {
    const result = validateOptionalNonNegativeNumber(value, 'dispatcher.clientTtl');
    return result;
  },
  'connections': (value: unknown) => {
    const result = validateConnections(value, 'dispatcher.connections');
    return result;
  },
  'connectTimeout': (value: unknown) => {
    const result = validateNonNegativeNumber(value, 'dispatcher.connectTimeout');
    return result;
  },
  'enabled': (value: unknown) => {
    const result = validateBoolean(value, 'dispatcher.enabled');
    return result;
  },
  'headersTimeout': (value: unknown) => {
    const result = validateNonNegativeNumber(value, 'dispatcher.headersTimeout');
    return result;
  },
  'keepAliveMaxTimeout': (value: unknown) => {
    const result = validateNonNegativeNumber(value, 'dispatcher.keepAliveMaxTimeout');
    return result;
  },
  'keepAliveTimeout': (value: unknown) => {
    const result = validateNonNegativeNumber(value, 'dispatcher.keepAliveTimeout');
    return result;
  },
  'keepAliveTimeoutThreshold': (value: unknown) => {
    const result = validateNonNegativeNumber(value, 'dispatcher.keepAliveTimeoutThreshold');
    return result;
  },
  'localAddress': (value: unknown) => {
    const result = validateOptionalNonEmptyString(value, 'dispatcher.localAddress');
    return result;
  },
  'maxConcurrentStreams': (value: unknown) => {
    const result = validatePositiveInteger(value, 'dispatcher.maxConcurrentStreams');
    return result;
  },
  'maxHeaderSize': (value: unknown) => {
    const result = validatePositiveInteger(value, 'dispatcher.maxHeaderSize');
    return result;
  },
  'maxOrigins': (value: unknown) => {
    const result = validateOptionalPositiveInteger(value, 'dispatcher.maxOrigins');
    return result;
  },
  'maxRequestsPerClient': (value: unknown) => {
    const result = validateOptionalPositiveInteger(value, 'dispatcher.maxRequestsPerClient');
    return result;
  },
  'maxResponseSize': (value: unknown) => {
    const result = validateMaxResponseSize(value, 'dispatcher.maxResponseSize');
    return result;
  },
  'pipelining': (value: unknown) => {
    const result = validatePipelining(value, 'dispatcher.pipelining');
    return result;
  },
  'strictContentLength': (value: unknown) => {
    const result = validateBoolean(value, 'dispatcher.strictContentLength');
    return result;
  }
};

/**
 * Validates dispatcher configuration object
 * @param val - Dispatcher configuration to validate
 * @throws ConfigurationError if validation fails
 */
export function validateDispatcher(val: unknown): void {
  if (val === undefined || val === null) {
    return;
  }

  if (typeof val !== 'object' || Array.isArray(val)) {
    throw new ConfigurationError('dispatcher must be an object');
  }

  const dispatcher = val as Record<string, unknown>;

  for (const [
    key,
    value
  ] of Object.entries(dispatcher)) {
    const validator = VALIDATORS[key];

    if (validator === undefined) {
      throw new ConfigurationError(`"dispatcher.${key}" is not declared in the schema`);
    }
    validator(value);
  }
}
