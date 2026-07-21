import { ConfigurationError, ConfigValidation } from '@studnicky/config';

import type { RetryConfigInterface } from '../../interfaces/index.js';

import { RETRY_CONFIG_KEYS } from '../../constants/index.js';
import {
  backoffStrategy,
  errorClassifier,
  hookTimeoutMs,
  maxElapsedMs,
  maxRetries
} from './schemas/index.js';

const propertyValidators: Record<string, (val: unknown) => void> = {
  'backoffStrategy': backoffStrategy.validateBackoffStrategy,
  'errorClassifier': errorClassifier.validateErrorClassifier,
  'hookTimeoutMs': hookTimeoutMs.validateHookTimeoutMs,
  'maxElapsedMs': maxElapsedMs.validateMaxElapsedMs,
  'maxRetries': maxRetries.validateMaxRetries
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
      const configObj: Record<string, unknown> = {};
      for (const key of Object.keys(userConfig)) {
        configObj[key] = Reflect.get(userConfig, key);
      }

      ConfigValidation.assertNoUnknownKeys(configObj, RETRY_CONFIG_KEYS);

      for (const [key, validator] of Object.entries(propertyValidators)) {
        if (key in userConfig) {
          validator(configObj[key]);
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
