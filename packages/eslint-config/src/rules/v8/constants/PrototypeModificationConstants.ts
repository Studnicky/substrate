/** Data constants for the `prototype-modification` rule: the callee names it recognizes on `Object` and `Reflect`. */

export const DEFINE_CALLEE_NAMES: ReadonlySet<string> = new Set(['defineProperties', 'defineProperty', 'setPrototypeOf']);
export const REFLECT_CALLEE_NAMES: ReadonlySet<string> = new Set(['set', 'setPrototypeOf']);
