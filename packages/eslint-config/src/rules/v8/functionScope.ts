import type { Rule } from 'eslint';

const FUNCTION_TYPES: ReadonlySet<string> = new Set([
  'ArrowFunctionExpression',
  'FunctionDeclaration',
  'FunctionExpression'
]);

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
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (FUNCTION_TYPES.has(current.type)) { return true; }

      if (current.type === 'PropertyDefinition') {
        const rawNode = current as unknown as Record<string, unknown>;
        return rawNode.static !== true;
      }

      if (current.type === 'Program') { return false; }

      current = current.parent;
    }

    return false;
  }
}
