/**
 * Array logic operators for multi-value conditions - using Node.js array method names
 */

import { DeepFreeze } from '../utils/deepFreeze.js';

export const ArrayLogic = DeepFreeze.deepFreeze({
  'CORE': {
    // All items must match (Array.every)
    'EVERY': (results: boolean[]) => {
      const result = results.every(Boolean);

      return result;
    },
    // No items should match
    'NONE': (results: boolean[]) => {
      const result = results.every((item) => {
        const isNotMatch = !item;

        return isNotMatch;
      });

      return result;
    },
    // Exactly one item must match
    'ONE': (results: boolean[]) => {
      const result = results.filter(Boolean).length === 1;

      return result;
    },
    // At least one item must match (Array.some)
    'SOME': (results: boolean[]) => {
      const result = results.some(Boolean);

      return result;
    }
  }
});
