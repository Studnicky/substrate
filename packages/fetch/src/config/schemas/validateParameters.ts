/**
 * Query parameters validation schema
 */

import { ConfigurationError } from '../../errors/index.js';

export class ValidateParameters {
  private static isSimpleParameterValue(item: unknown): boolean {
    const result = typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean';
    return result;
  }

  /**
   * Validates query parameters object
   * All param values must be string, number, boolean, or arrays of these types
   *
   * @param value - Query parameters configuration to validate
   * @throws ConfigurationError if validation fails
   */
  public static validate(value: unknown): void {
    if (value === undefined || value === null) {
      return;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new ConfigurationError('parameters must be an object');
    }

    const parameterNames = Object.keys(value);
    const parameterNameLength = parameterNames.length;
    for (let index = 0; index < parameterNameLength; index += 1) {
      const key = parameterNames[index];
      if (key === undefined) {
        continue;
      }
      const parameterValue: unknown = Reflect.get(value, key);
      if (parameterValue !== null && parameterValue !== undefined) {
        const valueType = typeof parameterValue;
        const isValidType = valueType === 'string' || valueType === 'number' || valueType === 'boolean';
        const isValidArray = Array.isArray(parameterValue) && parameterValue.every(ValidateParameters.isSimpleParameterValue);

        if (!isValidType && !isValidArray) {
          throw new ConfigurationError(`param value for "${key}" must be string, number, boolean, or array of these types`);
        }
      }
    }
  }
}
