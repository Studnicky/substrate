import type { Rule } from 'eslint';

import { FunctionScope } from './functionScope.js';

/**
 * Shared trigger-position resolution for `inlineArrowFunctions` and
 * `inlineFunctions`. Both rules flag an inline callable (arrow or function
 * expression) that gets reallocated on every call/iteration; this class
 * answers "is this inline callable sitting in one of the positions where
 * that reallocation happens", independent of which node type (arrow vs.
 * function expression) is being inspected.
 *
 * Recognized positions, resolved by first unwrapping ternary branches and
 * array-literal elements (so `cond ? fn : fn` and `[["a", fn]]`-style
 * dispatch-table construction resolve to their real containing context):
 *   - Property value of an ObjectExpression that is rebuilt per call
 *     (dispatch map).
 *   - Default value of an AssignmentPattern (a default-parameter closure —
 *     allocated fresh on every invocation of the enclosing function).
 *   - Argument passed directly to a CallExpression/NewExpression whose call
 *     site is inside a loop.
 */
export class InlineCallablePosition {
  public static isFlagged(node: Rule.Node): boolean {
    const position = InlineCallablePosition.unwrapContainers(node);
    const container = position.parent;

    if (container === null) { return false; }

    if (InlineCallablePosition.isRebuiltObjectPropertyValue(position, container)) { return true; }
    if (InlineCallablePosition.isDefaultParameterValue(position, container)) { return true; }
    if (InlineCallablePosition.isLoopCallArgument(position, container)) { return true; }

    return false;
  }

  /** Walks outward through ConditionalExpression branches and ArrayExpression elements to find the real containing position. */
  private static unwrapContainers(node: Rule.Node): Rule.Node {
    let current: Rule.Node = node;

    for (;;) {
      const parent = current.parent;
      if (parent === null) { return current; }

      const rawParent = parent as unknown as Record<string, unknown>;

      if (parent.type === 'ConditionalExpression' && (rawParent.consequent === current || rawParent.alternate === current)) {
        current = parent;
        continue;
      }

      if (parent.type === 'ArrayExpression') {
        current = parent;
        continue;
      }

      return current;
    }
  }

  private static isRebuiltObjectPropertyValue(position: Rule.Node, container: Rule.Node): boolean {
    if (container.type !== 'Property') { return false; }

    const rawContainer = container as unknown as Record<string, unknown>;
    if (rawContainer.value !== position) { return false; }

    const objectExpr = container.parent;
    if (objectExpr?.type !== 'ObjectExpression') { return false; }

    return FunctionScope.isRebuiltInFunctionScope(objectExpr);
  }

  private static isDefaultParameterValue(position: Rule.Node, container: Rule.Node): boolean {
    if (container.type !== 'AssignmentPattern') { return false; }

    const rawContainer = container as unknown as Record<string, unknown>;
    return rawContainer.right === position;
  }

  private static isLoopCallArgument(position: Rule.Node, container: Rule.Node): boolean {
    if (container.type !== 'CallExpression' && container.type !== 'NewExpression') { return false; }

    const rawContainer = container as unknown as Record<string, unknown>;
    const args: unknown = rawContainer.arguments;
    if (!Array.isArray(args) || !args.includes(position)) { return false; }

    return FunctionScope.isInsideLoop(container);
  }
}
