import { ConfigurationError } from '@studnicky/config';

import { ThrottleConfigEntity } from '../../entities/ThrottleConfigEntity.js';

type ThrottleConfigType = ThrottleConfigEntity.Type;

class ThrottleConfigValidator {
  /**
   * Type guard that checks if value is a valid ThrottleConfigType
   *
   * Delegates to the schema-backed ThrottleConfigEntity.validate, which is the
   * single source of truth for throttle configuration validation. Catches the
   * ConfigurationError it throws on an invalid candidate and reports false.
   *
   * @param value - Value to check
   * @returns True if value is a valid ThrottleConfigType
   */
  public static isThrottleConfig(value: unknown): value is ThrottleConfigType {
    try {
      return ThrottleConfigEntity.validate(value);
    } catch (error) {
      if (error instanceof ConfigurationError) {
        return false;
      }

      throw error;
    }
  }
}

export { ThrottleConfigValidator };
