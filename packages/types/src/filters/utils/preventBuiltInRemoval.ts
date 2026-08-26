/**
 * @module preventBuiltInRemoval
 * @description Prevents removing built-in handlers
 */

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { PluginError } from '../errors/PluginError.js';

export class PreventBuiltInRemoval {
  /**
   * Validate plugin removal
   */
  static preventBuiltInRemoval(type: string, name: string, builtIns: Map<string, unknown>): void {
    if (builtIns.has(name)) {
      throw new PluginError(
        `Cannot remove built-in ${type.toLowerCase()} '${name}'`,
        ErrorCodes.CORE.BUILTIN_REMOVAL_DENIED,
        {
          'name': name,
          'pluginType': type.toLowerCase()
        }
      );
    }
  }
}
