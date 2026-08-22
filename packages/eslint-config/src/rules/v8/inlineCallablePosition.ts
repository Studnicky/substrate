import type {
  Rule, Scope
} from 'eslint';

import { LoopContext } from '../shared/LoopContext.js';
import { ObjectGuard } from '../shared/ObjectGuard.js';

// MEASURED, Node v24: allocating a closure (arrow or function expression) is
// 2.3x measurably costly WHEN GENUINELY HOT (rebuilt every iteration of a
// real loop). But neither "rebuilt in some enclosing function" (the
// predecessor's `FunctionScope.isRebuiltInFunctionScope` heuristic) nor "has
// a default-parameter closure at all" (the predecessor's unconditional flag)
// is evidence of hotness — a factory function called exactly once at module
// init satisfies both and was flagged identically to real hot-loop code.
// This module replaces both heuristics with `LoopContext.isPerIteration`
// (proof: the position is lexically inside a loop, or inside a built-in
// per-element iteration callback) or, where the allocation site is not
// itself lexically per-iteration (a default-parameter value is evaluated at
// CALL time, not at its own source position), a bounded call-site
// reachability check identical in spirit to `arrayConcatOutsideLoops`'s
// `HelperReachability` — flag only when every call site of the owning
// function is itself provably per-iteration. Unprovable cases go unflagged:
// silence over a guess, matching this package's established posture.

class EnclosingFunction {
  /** Nearest ancestor function (declaration/expression/arrow) containing `node`. */
  public static find(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      const isFunction = current.type === 'ArrowFunctionExpression'
        || current.type === 'FunctionDeclaration'
        || current.type === 'FunctionExpression';

      if (isFunction) {
        return current;
      }

      current = current.parent;
    }

    return undefined;
  }
}

class DeclaredFunctionVariable {
  // Resolves the scope variable that calls to `functionNode` would reference:
  // the function's own name for a `function foo() {}` declaration, or the
  // bound identifier for `const foo = function () {}` / `const foo = () => {}`.
  public static resolve(functionNode: Rule.Node, context: Rule.RuleContext): Scope.Variable | undefined {
    if (functionNode.type === 'FunctionDeclaration') {
      const raw = functionNode as unknown as Record<string, unknown>;
      const id = ObjectGuard.isObject(raw.id) ? raw.id : undefined;
      const name = id !== undefined && typeof id.name === 'string' ? id.name : undefined;

      if (name === undefined) {
        return undefined;
      }

      const declared = context.sourceCode.getDeclaredVariables(functionNode);

      const result = declared.find((variable) => {
        const result = variable.name === name;

        return result;
      });

      return result;
    }

    if (functionNode.type === 'FunctionExpression' || functionNode.type === 'ArrowFunctionExpression') {
      const parent = functionNode.parent;

      if (parent?.type !== 'VariableDeclarator') {
        return undefined;
      }

      const raw = parent as unknown as Record<string, unknown>;
      const id = ObjectGuard.isObject(raw.id) ? raw.id : undefined;

      if (id?.type !== 'Identifier' || typeof id.name !== 'string') {
        return undefined;
      }

      const declared = context.sourceCode.getDeclaredVariables(parent);

      const result = declared.find((variable) => {
        const result = variable.name === id.name;

        return result;
      });

      return result;
    }

    return undefined;
  }
}

class DefaultParameterReachability {
  /**
   * A default-parameter closure is allocated fresh on every CALL to the
   * function that owns it — it has no loop-relative source position of its
   * own; it lives in a parameter list, evaluated at call time. Provable only
   * for the same bounded shape as `arrayConcatOutsideLoops`'s
   * `HelperReachability`: the owning function has exactly one resolvable
   * binding, every reference to which is a direct call, and every one of
   * those calls is itself per-iteration.
   */
  public static isReachedOnlyPerIteration(assignmentPattern: Rule.Node, context: Rule.RuleContext): boolean {
    const owner = EnclosingFunction.find(assignmentPattern);

    if (owner === undefined) {
      return false;
    }

    const variable = DeclaredFunctionVariable.resolve(owner, context);

    if (variable === undefined) {
      return false;
    }

    const readReferences = variable.references.filter((reference: Scope.Reference) => {
      const result = !reference.isWrite();

      return result;
    });

    if (readReferences.length === 0) {
      return false;
    }

    const result = readReferences.every((reference: Scope.Reference) => {
      const identifier = reference.identifier as unknown as { readonly 'parent'?: unknown };
      const parent = identifier.parent;

      if (!ObjectGuard.isObject(parent) || parent.type !== 'CallExpression' || parent.callee !== (reference.identifier as unknown)) {
        return false;
      }

      const result = LoopContext.isPerIteration(parent as unknown as Rule.Node, context);

      return result;
    });

    return result;
  }
}

/**
 * Shared trigger-position resolution for `inlineArrowFunctions` and
 * `inlineFunctions`. Both rules flag an inline callable (arrow or function
 * expression) that is provably reallocated once per loop iteration; this
 * class answers "is this inline callable sitting in one of the positions
 * where that provably happens", independent of which node type (arrow vs.
 * function expression) is being inspected.
 *
 * Recognized positions, resolved by first unwrapping ternary branches and
 * array-literal elements (so `cond ? fn : fn` and `[["a", fn]]`-style
 * dispatch-table construction resolve to their real containing context):
 *   - Property value of an ObjectExpression that is itself constructed
 *     per-iteration (dispatch map built inside a loop).
 *   - Default value of an AssignmentPattern, where every call site of the
 *     owning function is provably per-iteration.
 *   - Argument passed directly to a CallExpression/NewExpression whose call
 *     site is itself per-iteration.
 */
export class InlineCallablePosition {
  public static isFlagged(node: Rule.Node, context: Rule.RuleContext): boolean {
    const position = InlineCallablePosition.unwrapContainers(node);
    const container = position.parent;

    if (container === null) {
      return false;
    }

    if (InlineCallablePosition.isPerIterationObjectPropertyValue(position, container, context)) {
      return true;
    }
    if (InlineCallablePosition.isProvablyHotDefaultParameterValue(position, container, context)) {
      return true;
    }
    if (InlineCallablePosition.isPerIterationCallArgument(position, container, context)) {
      return true;
    }

    return false;
  }

  /** Walks outward through ConditionalExpression branches and ArrayExpression elements to find the real containing position. */
  private static unwrapContainers(node: Rule.Node): Rule.Node {
    let current: Rule.Node = node;

    for (;;) {
      const parent = current.parent;

      if (parent === null) {
        return current;
      }

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

  private static isPerIterationObjectPropertyValue(position: Rule.Node, container: Rule.Node, context: Rule.RuleContext): boolean {
    if (container.type !== 'Property') {
      return false;
    }

    const rawContainer = container as unknown as Record<string, unknown>;

    if (rawContainer.value !== position) {
      return false;
    }

    const objectExpr = container.parent;

    if (objectExpr?.type !== 'ObjectExpression') {
      return false;
    }

    // Evidence-based: only flag when the object literal is provably
    // constructed per-iteration. "Inside some function" (the predecessor's
    // heuristic) is not evidence — a one-shot factory called once satisfies
    // that too, and was flagged identically to real hot-loop code.
    const result = LoopContext.isPerIteration(objectExpr, context);

    return result;
  }

  private static isProvablyHotDefaultParameterValue(position: Rule.Node, container: Rule.Node, context: Rule.RuleContext): boolean {
    if (container.type !== 'AssignmentPattern') {
      return false;
    }

    const rawContainer = container as unknown as Record<string, unknown>;

    if (rawContainer.right !== position) {
      return false;
    }

    const result = DefaultParameterReachability.isReachedOnlyPerIteration(container, context);

    return result;
  }

  private static isPerIterationCallArgument(position: Rule.Node, container: Rule.Node, context: Rule.RuleContext): boolean {
    if (container.type !== 'CallExpression' && container.type !== 'NewExpression') {
      return false;
    }

    const rawContainer = container as unknown as Record<string, unknown>;
    const argumentList: unknown = rawContainer.arguments;

    if (!Array.isArray(argumentList) || !argumentList.includes(position)) {
      return false;
    }

    const result = LoopContext.isPerIteration(container, context);

    return result;
  }
}
