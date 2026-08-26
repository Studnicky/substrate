/**
 * @module ArrayLogicOperations
 * @description Centralized array logic operations for FilterEngine
 */

import type { ArrayLogicFunctionInterface } from '../interfaces.js';

import { ArrayLogic } from '../enums/ArrayLogic.js';

/**
 * ArrayLogicOperations - Handles all array-related logic operations
 */
export class ArrayLogicOperations {
  /**
   * Apply logical operation to array of boolean results
   */
  static applyLogic(results: boolean[], logic = 'SOME'): boolean {
    const namedHandlers: Record<string, ArrayLogicFunctionInterface> = ArrayLogic.CORE;
    const handler = namedHandlers[logic] ?? ArrayLogic.CORE.SOME;
    const result = handler(results);

    return result;
  }
}
