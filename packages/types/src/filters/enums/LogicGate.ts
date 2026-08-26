/**
 * Logical operators for combining criteria with direct function access
 */

import { DeepFreeze } from '../utils/deepFreeze.js';

export const LogicGate = DeepFreeze.deepFreeze({
  'CORE': {
    'AND': (results: boolean[]) => {
      const result = results.every(Boolean);

      return result;
    },
    'NAND': (results: boolean[]) => {
      const result = !results.every(Boolean);

      return result;
    },
    'NOR': (results: boolean[]) => {
      const result = !results.some(Boolean);

      return result;
    },
    'NOT': (results: boolean[]) => {
      const result = results[0] !== true;

      return result;
    },
    'OR': (results: boolean[]) => {
      const result = results.some(Boolean);

      return result;
    },
    'XNOR': (results: boolean[]) => {
      const result = results.filter(Boolean).length !== 1;

      return result;
    },
    'XOR': (results: boolean[]) => {
      const result = results.filter(Boolean).length === 1;

      return result;
    }
  }
});
