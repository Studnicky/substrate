/**
 * @module validateFunction
 * @description Validates that a handler is a function
 */

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { PluginError } from '../errors/PluginError.js';

/**
 * Validate that a handler is a function
 */
export function validateFunction(type: string, name: string, handler: unknown): void {
  if (typeof handler !== 'function') {
    throw new PluginError(
      `${type} '${name}' must be a function`,
      ErrorCodes.CORE.INVALID_FUNCTION,
      {
        'name': name,
        'pluginType': type.toLowerCase()
      }
    );
  }
}
