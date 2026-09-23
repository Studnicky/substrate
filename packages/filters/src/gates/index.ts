/**
 * Core logic gate handlers accessible via dot notation
 */

/** Logic gate implementations backing `CORE`. */
class CoreGateHandlers {
  public static and(results: boolean[]): boolean {
    const result = results.every(Boolean);

    return result;
  }

  public static not(results: boolean[]): boolean {
    const result = results[0] !== true;

    return result;
  }

  public static or(results: boolean[]): boolean {
    const result = results.some(Boolean);

    return result;
  }

  public static xor(results: boolean[]): boolean {
    const result = results.filter(Boolean).length === 1;

    return result;
  }
}

export const CORE = {
  'AND': CoreGateHandlers.and,
  'NOT': CoreGateHandlers.not,
  'OR': CoreGateHandlers.or,
  'XOR': CoreGateHandlers.xor
};
