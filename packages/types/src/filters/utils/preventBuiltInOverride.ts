/**
 * @module preventBuiltInOverride
 * @description Prevents overriding built-in handlers
 */

import { ErrorCodes } from '../enums/ErrorCodes.js';
import { PluginError } from '../errors/PluginError.js';

export class PreventBuiltInOverride {
  /**
   * Check if trying to override a built-in
   */
  static preventBuiltInOverride(type: string, name: string, builtIns: Map<string, unknown>): void {
    if (builtIns.has(name)) {
      throw new PluginError(
        `Cannot override built-in ${type.toLowerCase()} '${name}'`,
        ErrorCodes.CORE.BUILTIN_OVERRIDE_DENIED,
        {
          'name': name,
          'pluginType': type.toLowerCase()
        }
      );
    }
  }
}
