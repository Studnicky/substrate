/**
 * Internal configuration validation utilities
 *
 * Exposed for testing and advanced use — not part of the public package surface.
 */

import { ConfigurationError, ConfigValidation } from '@studnicky/config';

import type { MutexConfigEntity } from '../entities/MutexConfigEntity.js';

import {
  DEFAULT_TIMEOUT, MUTEX_CONFIG_KEYS, UNLIMITED_QUEUE_SIZE
} from '../constants/index.js';

const DEFAULT_CONFIG: MutexConfigEntity.Type = {
  'enableCoalescing': false,
  'maxQueueSize': UNLIMITED_QUEUE_SIZE,
  'timeout': DEFAULT_TIMEOUT
};

/**
 * Internal validator for mutex configuration.
 */
class ConfigValidator {
  static validate(userConfig?: Partial<MutexConfigEntity.Type>): MutexConfigEntity.Type {
    try {
      if (userConfig !== undefined) {
        const configObj: Record<string, unknown> = {};

        for (const key of Object.keys(userConfig)) {
          configObj[key] = Reflect.get(userConfig, key);
        }

        ConfigValidation.assertNoUnknownKeys(configObj, MUTEX_CONFIG_KEYS);
        ConfigValidation.assertBoolean(configObj.enableCoalescing, 'enableCoalescing');
        ConfigValidation.assertNumber(configObj.maxQueueSize, 'maxQueueSize');
        ConfigValidation.assertFinite(configObj.maxQueueSize, 'maxQueueSize');
        ConfigValidation.assertInteger(configObj.maxQueueSize, 'maxQueueSize');
        ConfigValidation.assertNonNegative(configObj.maxQueueSize, 'maxQueueSize');
        ConfigValidation.assertNumber(configObj.timeout, 'timeout');
        ConfigValidation.assertFinite(configObj.timeout, 'timeout');
        ConfigValidation.assertInteger(configObj.timeout, 'timeout');
        ConfigValidation.assertNonNegative(configObj.timeout, 'timeout');
      }

      const config: MutexConfigEntity.Type = { ...DEFAULT_CONFIG };

      if (userConfig !== undefined) {
        if (userConfig.enableCoalescing !== undefined) {
          config.enableCoalescing = userConfig.enableCoalescing;
        }
        if (userConfig.maxQueueSize !== undefined) {
          config.maxQueueSize = userConfig.maxQueueSize;
        }
        if (userConfig.timeout !== undefined) {
          config.timeout = userConfig.timeout;
        }
      }

      return config;
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

const defaultConfig: MutexConfigEntity.Type = ConfigValidator.validate();

export const configInternal = {
  'defaultConfig': defaultConfig,
  'validateConfig': ConfigValidator.validate
};
