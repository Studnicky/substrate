import { Frozen } from '#runtime';
/**
 * Logical operators for combining criteria with direct function access
 */


/** Logic gate implementations backing `LogicGate.CORE`. */
class LogicGateHandlers {
  public static and(results: boolean[]): boolean {
    const result = results.every(Boolean);

    return result;
  }

  public static nand(results: boolean[]): boolean {
    const result = !results.every(Boolean);

    return result;
  }

  public static nor(results: boolean[]): boolean {
    const result = !results.some(Boolean);

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

  public static xnor(results: boolean[]): boolean {
    const result = results.filter(Boolean).length !== 1;

    return result;
  }

  public static xor(results: boolean[]): boolean {
    const result = results.filter(Boolean).length === 1;

    return result;
  }
}

export const LogicGate = Frozen.deepFreeze({
  'CORE': {
    'AND': LogicGateHandlers.and,
    'NAND': LogicGateHandlers.nand,
    'NOR': LogicGateHandlers.nor,
    'NOT': LogicGateHandlers.not,
    'OR': LogicGateHandlers.or,
    'XNOR': LogicGateHandlers.xnor,
    'XOR': LogicGateHandlers.xor
  }
});
