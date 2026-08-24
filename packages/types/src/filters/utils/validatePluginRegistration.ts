/**
 * @module validatePluginRegistration
 * @description Validates plugin registration
 */

import { preventBuiltInOverride } from './preventBuiltInOverride.js';
import { validateFunction } from './validateFunction.js';

/**
 * Validate plugin registration
 */
export function validatePluginRegistration(
  type: string,
  name: string,
  handler: unknown,
  builtIns: Map<string, unknown>
): void {
  preventBuiltInOverride(type, name, builtIns);
  validateFunction(type, name, handler);
}
