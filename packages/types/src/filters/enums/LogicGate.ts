/**
 * Logical operators for combining criteria with direct function access
 */

import { DeepFreeze } from '../utils/deepFreeze.js';

export const LogicGate = DeepFreeze.deepFreeze({
  'CORE': {
    'AND': (results: boolean[]) => {return results.every(Boolean);},
    'NAND': (results: boolean[]) => {return !results.every(Boolean);},
    'NOR': (results: boolean[]) => {return !results.some(Boolean);},
    'NOT': (results: boolean[]) => {return !results[0];},
    'OR': (results: boolean[]) => {return results.some(Boolean);},
    'XNOR': (results: boolean[]) => {return results.filter(Boolean).length !== 1;},
    'XOR': (results: boolean[]) => {return results.filter(Boolean).length === 1;}
  }
});
