/**
 * Internal configuration validation utilities
 *
 * Exposed for testing and advanced use — not part of the public package surface.
 */

import { ConfigValidation } from '@studnicky/config';

import type { MutexConfigType } from '../types/MutexConfigType.js';

import {
  DEFAULT_TIMEOUT, MUTEX_CONFIG_KEYS, UNLIMITED_QUEUE_SIZE
} from '../constants/index.js';
import { ConfigurationError } from '../errors/ConfigurationError.js';

const DEFAULT_CONFIG: MutexConfigType = {
  'enableCoalescing': false,
  'maxQueueSize': UNLIMITED_QUEUE_SIZE,
  'timeout': DEFAULT_TIMEOUT
};

function validateConfig(userConfig?: Partial<MutexConfigType>): MutexConfigType {
  try {
    if (userConfig) {
      const configObj = userConfig as Record<string, unknown>;

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

    const config: MutexConfigType = { ...DEFAULT_CONFIG };

    if (userConfig) {
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

const defaultConfig: MutexConfigType = validateConfig();

export const configInternal = {
  'defaultConfig': defaultConfig,
  'validateConfig': validateConfig
};
