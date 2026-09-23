import type {
  Rule, Scope
} from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import { LoopContext } from '../shared/LoopContext.js';

// Flags only per-iteration-proven positions; unprovable cases go unflagged.
// Rationale and measurement: docs/eslint/rules/v8/inline-arrow-functions.md.

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
  // The declared function's own name, or the bound identifier for a
  // `const foo = function () {}` / `const foo = () => {}` variable declarator.
  public static resolve(functionNode: Rule.Node, context: Rule.RuleContext): Scope.Variable | undefined {
    if (functionNode.type === 'FunctionDeclaration') {
      const raw = functionNode as unknown as Record<string, unknown>;
      const id = Predicates.isRecord(raw.id) ? raw.id : undefined;
      const name = id !== undefined && typeof id.name === 'string' ? id.name : undefined;

      if (name === undefined) {
        return undefined;
      }

      const declared = context.sourceCode.getDeclaredVariables(functionNode);

      const result = declared.find((variable) => {
        const isMatchingName = variable.name === name;

        return isMatchingName;
      });

      return result;
    }

    if (functionNode.type === 'FunctionExpression' || functionNode.type === 'ArrowFunctionExpression') {
      const parent = functionNode.parent;

      if (parent?.type !== 'VariableDeclarator') {
        return undefined;
      }

      const raw = parent as unknown as Record<string, unknown>;
      const id = Predicates.isRecord(raw.id) ? raw.id : undefined;

      if (id?.type !== 'Identifier' || typeof id.name !== 'string') {
        return undefined;
      }

      const declared = context.sourceCode.getDeclaredVariables(parent);

      const result = declared.find((variable) => {
        const isMatchingId = variable.name === id.name;

        return isMatchingId;
      });

      return result;
    }

    return undefined;
  }
}

class DefaultParameterReachability {
  /** Bounded reachability check for a default-parameter closure; scope: docs/eslint/rules/v8/inline-arrow-functions.md. */
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

      if (!Predicates.isRecord(parent) || parent.type !== 'CallExpression' || parent.callee !== (reference.identifier as unknown)) {
        return false;
      }

      const isPerIterationCall = LoopContext.isPerIteration(parent as unknown as Rule.Node, context);

      return isPerIterationCall;
    });

    return result;
  }
}

/** Shared trigger-position resolution for `inlineArrowFunctions`/`inlineFunctions`; positions: docs/eslint/rules/v8/inline-arrow-functions.md. */
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

    // Evidence-based: only flags when the object literal is provably
    // constructed per-iteration, not merely "inside some function".
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
