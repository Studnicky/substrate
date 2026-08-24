/**
 * Core logic gate handlers accessible via dot notation
 */

export const CORE = {
  'AND': (results: boolean[]) => {return results.every(Boolean);},
  'NOT': (results: boolean[]) => {return !results[0];},
  'OR': (results: boolean[]) => {return results.some(Boolean);},
  'XOR': (results: boolean[]) => {return results.filter(Boolean).length === 1;}
};
