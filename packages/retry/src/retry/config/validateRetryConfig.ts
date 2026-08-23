import { ConfigurationError, ConfigValidation } from '@studnicky/config';

import type { RetryConfigInterface } from '../../interfaces/index.js';

import { RETRY_CONFIG_KEYS } from '../../constants/index.js';
import {
  backoffStrategy,
  errorClassifier,
  hookTimeoutMs,
  maximumElapsedMs,
  maximumRetries
} from './schemas/index.js';

const propertyValidators: Record<string, (value: unknown) => void> = {
  'backoffStrategy': backoffStrategy.validateBackoffStrategy,
  'errorClassifier': errorClassifier.validateErrorClassifier,
  'hookTimeoutMs': hookTimeoutMs.validateHookTimeoutMs,
  'maximumElapsedMs': maximumElapsedMs.validateMaximumElapsedMs,
  'maximumRetries': maximumRetries.validateMaximumRetries
};

/**
 * Validates a retry configuration structurally, without constructing any
 * runtime state (e.g. `DefaultHttpErrorClassifier`). Shared by `Retry`'s
 * constructor and `RetryConfigGuard.isRetryConfig` so cheap validation never
 * requires building a full `Retry` instance.
 */
class RetryConfigValidator {
  static validate(config?: RetryConfigInterface): RetryConfigInterface {
    try {
      const userConfig = config ?? {};
      const configObject: Record<string, unknown> = {};
      const userConfigKeys = Object.keys(userConfig);
      const userConfigKeysLength = userConfigKeys.length;
      for (let keyIndex = 0; keyIndex < userConfigKeysLength; keyIndex += 1) {
        const key = userConfigKeys[keyIndex]!;
        Reflect.set(configObject, key, Reflect.get(userConfig, key));
      }

      ConfigValidation.assertNoUnknownKeys(configObject, RETRY_CONFIG_KEYS);

      const validatorEntries = Object.entries(propertyValidators);
      const validatorEntriesLength = validatorEntries.length;
      for (let validatorIndex = 0; validatorIndex < validatorEntriesLength; validatorIndex += 1) {
        const [key, validator] = validatorEntries[validatorIndex]!;
        if (key in userConfig) {
          validator(Reflect.get(configObject, key));
        }
      }

      return userConfig;
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error;
      }
      if (error instanceof Error) {
        throw ConfigurationError.create(error.message);
      }
      throw ConfigurationError.create(String(error));
    }
  }
}

const validateRetryConfig = { 'validate': RetryConfigValidator.validate };

export { validateRetryConfig };
