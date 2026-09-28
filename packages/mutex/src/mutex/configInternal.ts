/**
 * Internal configuration validation utilities
 *
 * Exposed for testing and advanced use — not part of the public package surface.
 */

import { ConfigurationError } from '@studnicky/config/browser';
import { SchemaIntakeError } from '@studnicky/entity/browser';
import { Predicates } from '@studnicky/types/browser';

import { MutexConfigEntity } from '../entities/MutexConfigEntity.js';

/**
 * Internal validator for mutex configuration.
 */
class ConfigValidator {
  static validate(userConfig?: unknown): MutexConfigEntity.Type {
    try {
      const config = MutexConfigEntity.intake(userConfig ?? {});
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

const defaultConfig: MutexConfigEntity.Type = MutexConfigEntity.create();

export const configInternal = {
  'defaultConfig': defaultConfig,
  'validateConfig': ConfigValidator.validate
};
