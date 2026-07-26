import type { Rule } from 'eslint';

import { FUNCTION_TYPES, LOOP_TYPES, REBUILT_IN_FUNCTION_SCOPE_CACHE } from './constants/FunctionScopeConstants.js';

export class FunctionScope {
  /**
   * Walks up from `node` to determine whether the object literal it belongs to
   * is rebuilt on every call (inside a function body — a new object allocated
   * per invocation) versus built once (module top-level `const`, or a `static`
   * class field, both evaluated a single time).
   *
   * Returns `true` (flag it) when a function-scope boundary is crossed before
   * reaching Program scope or a `static` field initializer. A pre-built,
   * module-scope or `static` dispatch map never re-allocates its inline
   * function values, so it is not flagged.
   */
  public static isRebuiltInFunctionScope(node: Rule.Node): boolean {
    const cached = REBUILT_IN_FUNCTION_SCOPE_CACHE.get(node);
    if (cached !== undefined) { return cached; }

    let current: Rule.Node | null = node.parent;
    let result = false;

    while (current !== null) {
      if (FUNCTION_TYPES.has(current.type)) { result = true; break; }

      if (current.type === 'PropertyDefinition') {
        const rawNode = current as unknown as Record<string, unknown>;
        result = rawNode.static !== true;
        break;
      }

      if (current.type === 'Program') { result = false; break; }

      current = current.parent;
    }

    REBUILT_IN_FUNCTION_SCOPE_CACHE.set(node, result);
    return result;
  }

  /**
   * Walks up from `node` to determine whether it is nested inside a loop
   * without crossing a function-scope boundary first. Used by V8 optimization
   * rules (e.g. try-catch-in-loops, regexp-in-loops) that must not flag
   * constructs inside a nested function or arrow function body, since those
   * run in their own scope rather than per-iteration of an outer loop.
   *
   * Returns `true` as soon as a loop node is reached. Stops and returns
   * `false` upon reaching a function-scope boundary or `Program`.
   */
  public static isInsideLoop(node: Rule.Node): boolean {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (LOOP_TYPES.has(current.type)) { return true; }

      if (FUNCTION_TYPES.has(current.type)) { return false; }

      current = current.parent;
    }

    return false;
  }
}
