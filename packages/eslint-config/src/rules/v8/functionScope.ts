import type { Rule } from 'eslint';

import { FUNCTION_TYPES, LOOP_TYPES, REBUILT_IN_FUNCTION_SCOPE_CACHE } from './constants/FunctionScopeConstants.js';

export class FunctionScope {
  // True when a function-scope boundary is crossed before Program or a static field initializer —
  // a module-scope or static dispatch map is built once and never flagged.
  public static isRebuiltInFunctionScope(node: Rule.Node): boolean {
    const cached = REBUILT_IN_FUNCTION_SCOPE_CACHE.get(node);
    if (cached !== undefined) { return cached; }

    let current: Rule.Node | null = node.parent;
    let result = false;

    while (current !== null) {
      if (FUNCTION_TYPES.has(current.type)) { result = true; break; }

      if (current.type === 'PropertyDefinition') {
        result = current.static !== true;
        break;
      }

      if (current.type === 'Program') { result = false; break; }

      current = current.parent;
    }

    REBUILT_IN_FUNCTION_SCOPE_CACHE.set(node, result);
    return result;
  }

  // True once a loop is reached without crossing a function boundary first; used by
  // try-catch-in-loops and regexp-in-loops so a nested function body is not flagged as per-iteration.
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
