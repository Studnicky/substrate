/**
 * Internal configuration validation utilities
 *
 * Exposed for testing and advanced use — not part of the public package surface.
 */

import { ConfigurationError } from '@studnicky/config';
import { SchemaIntakeError } from '@studnicky/json';
import { Predicates } from '@studnicky/types';

import { DEFAULT_TIMEOUT, UNLIMITED_QUEUE_SIZE } from '../constants/index.js';
import { MutexConfigEntity } from '../entities/MutexConfigEntity.js';

/**
 * Internal validator for mutex configuration.
 */
class ConfigValidator {
  static validate(userConfig?: Partial<MutexConfigEntity.Type>): MutexConfigEntity.Type {
    try {
      const config = MutexConfigEntity.intake(userConfig ?? {
        'enableCoalescing': false,
        'maximumQueueSize': UNLIMITED_QUEUE_SIZE,
        'timeout': DEFAULT_TIMEOUT
      });
      return config;
    } catch (error) {
      if (error instanceof SchemaIntakeError) {
        throw ConfigurationError.create(error.message);
      }
      if (error instanceof ConfigurationError) {
        throw error;
      }
      if (Predicates.isError(error)) {
        throw ConfigurationError.create(error.message);
      }
      throw ConfigurationError.create(String(error));
    }
  }
}

const defaultConfig: MutexConfigEntity.Type = MutexConfigEntity.create({
  'enableCoalescing': false,
  'maximumQueueSize': UNLIMITED_QUEUE_SIZE,
  'timeout': DEFAULT_TIMEOUT
});

export const configInternal = {
  'defaultConfig': defaultConfig,
  'validateConfig': ConfigValidator.validate
};
