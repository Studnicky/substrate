/**
 * @module validatePluginRegistration
 * @description Validates plugin registration
 */

import { PreventBuiltInOverride } from './preventBuiltInOverride.js';
import { ValidateFunction } from './validateFunction.js';

export class ValidatePluginRegistration {
  /**
   * Validate plugin registration
   */
  static validatePluginRegistration(
    type: string,
    name: string,
    handler: unknown,
    builtIns: Map<string, unknown>
  ): void {
    PreventBuiltInOverride.preventBuiltInOverride(type, name, builtIns);
    ValidateFunction.validateFunction(type, name, handler);
  }
}
