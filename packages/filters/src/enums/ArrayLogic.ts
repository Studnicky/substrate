import { Frozen } from '#runtime';
/**
 * Array logic operators for multi-value conditions - using Node.js array method names
 */


/** Array logic operator implementations backing `ArrayLogic.CORE`. */
class ArrayLogicHandlers {
  /** All items must match (Array.every) */
  public static every(results: boolean[]): boolean {
    const result = results.every(Boolean);

    return result;
  }

  /** No items should match */
  public static none(results: boolean[]): boolean {
    const result = results.every((item) => {
      const isNotMatch = !item;

      return isNotMatch;
    });

    return result;
  }

  /** Exactly one item must match */
  public static one(results: boolean[]): boolean {
    const result = results.filter(Boolean).length === 1;

    return result;
  }

  /** At least one item must match (Array.some) */
  public static some(results: boolean[]): boolean {
    const result = results.some(Boolean);

    return result;
  }
}

export const ArrayLogic = Frozen.deepFreeze({
  'CORE': {
    'EVERY': ArrayLogicHandlers.every,
    'NONE': ArrayLogicHandlers.none,
    'ONE': ArrayLogicHandlers.one,
    'SOME': ArrayLogicHandlers.some
  }
});
