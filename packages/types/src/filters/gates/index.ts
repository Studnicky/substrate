/**
 * Core logic gate handlers accessible via dot notation
 */

export const CORE = {
  'AND': (results: boolean[]) => {
    const result = results.every(Boolean);

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
  'XOR': (results: boolean[]) => {
    const result = results.filter(Boolean).length === 1;

    return result;
  }
};
