import type {
  Rule, Scope
} from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import { AstHelpers } from './astHelpers.js';

export class DeclaredFunctionVariable {
  // The declared function's own name, or the bound identifier for a
  // `const foo = function () {}` / `const foo = () => {}` variable declarator.
  public static resolve(functionNode: Rule.Node, context: Rule.RuleContext): Scope.Variable | undefined {
    if (functionNode.type === 'FunctionDeclaration') {
      const result = DeclaredFunctionVariable.resolveFunctionDeclarationVariable(functionNode, context);

      return result;
    }

    if (functionNode.type === 'FunctionExpression' || functionNode.type === 'ArrowFunctionExpression') {
      const result = DeclaredFunctionVariable.resolveDeclaratorVariable(functionNode, context);

      return result;
    }

    return undefined;
  }

  private static resolveFunctionDeclarationVariable(functionNode: Rule.Node, context: Rule.RuleContext): Scope.Variable | undefined {
    const rawId = AstHelpers.getNodeProperty(functionNode, 'id');
    const id = Predicates.isRecord(rawId) ? rawId : undefined;
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

  private static resolveDeclaratorVariable(functionNode: Rule.Node, context: Rule.RuleContext): Scope.Variable | undefined {
    const parent = functionNode.parent;

    if (parent?.type !== 'VariableDeclarator') {
      return undefined;
    }

    const id = Predicates.isRecord(parent.id) ? parent.id : undefined;

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
}
