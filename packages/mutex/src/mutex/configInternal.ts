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
  'maximumQueueSize': UNLIMITED_QUEUE_SIZE,
  'timeout': DEFAULT_TIMEOUT
};

/**
 * Internal validator for mutex configuration.
 */
class ConfigValidator {
  static validate(userConfig?: Partial<MutexConfigEntity.Type>): MutexConfigEntity.Type {
    try {
      if (userConfig !== undefined) {
        const configObject: Record<string, unknown> = {};
        const userConfigKeys = Object.keys(userConfig);
        const userConfigKeysLength = userConfigKeys.length;

        for (let index = 0; index < userConfigKeysLength; index++) {
          const key = userConfigKeys.at(index);

          if (key === undefined) {
            continue;
          }

          Reflect.set(configObject, key, Reflect.get(userConfig, key));
        }

        ConfigValidation.assertNoUnknownKeys(configObject, MUTEX_CONFIG_KEYS);
        ConfigValidation.assertBoolean(configObject.enableCoalescing, 'enableCoalescing');
        ConfigValidation.assertNumber(configObject.maximumQueueSize, 'maximumQueueSize');
        ConfigValidation.assertFinite(configObject.maximumQueueSize, 'maximumQueueSize');
        ConfigValidation.assertInteger(configObject.maximumQueueSize, 'maximumQueueSize');
        ConfigValidation.assertNonNegative(configObject.maximumQueueSize, 'maximumQueueSize');
        ConfigValidation.assertNumber(configObject.timeout, 'timeout');
        ConfigValidation.assertFinite(configObject.timeout, 'timeout');
        ConfigValidation.assertInteger(configObject.timeout, 'timeout');
        ConfigValidation.assertNonNegative(configObject.timeout, 'timeout');
      }

      const config: MutexConfigEntity.Type = { ...DEFAULT_CONFIG };

      if (userConfig !== undefined) {
        if (userConfig.enableCoalescing !== undefined) {
          config.enableCoalescing = userConfig.enableCoalescing;
        }
        if (userConfig.maximumQueueSize !== undefined) {
          config.maximumQueueSize = userConfig.maximumQueueSize;
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
