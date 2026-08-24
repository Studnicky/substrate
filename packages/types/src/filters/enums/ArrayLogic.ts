/**
 * Array logic operators for multi-value conditions - using Node.js array method names
 */

import { deepFreeze } from '../utils/deepFreeze.js';

export const ArrayLogic = deepFreeze({
  'CORE': {
    // All items must match (Array.every)
    'EVERY': (results: boolean[]) => {return results.every(Boolean);},
    // No items should match
    'NONE': (results: boolean[]) => {return results.every((result) => {return !result;});},
    // Exactly one item must match
    'ONE': (results: boolean[]) => {return results.filter(Boolean).length === 1;},
    // At least one item must match (Array.some)
    'SOME': (results: boolean[]) => {return results.some(Boolean);}
  }
});
