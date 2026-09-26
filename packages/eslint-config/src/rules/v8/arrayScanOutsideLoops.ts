import type { Rule, Scope } from 'eslint';

import { AstHelpers } from '../shared/astHelpers.js';
import { CallIdentity } from '../shared/CallIdentity.js';
import { LoopContext } from '../shared/LoopContext.js';
import {
  FUNCTION_TYPES, LOOP_TYPES, MESSAGE, RULE_NAME, SCAN_METHODS, SCAN_OWNERS
} from './constants/ArrayScanOutsideLoopsConstants.js';

// See docs/eslint/rules/v8/array-scan-outside-loops.md for the rationale. Identity is
// resolved via `CallIdentity`; per-iteration status is resolved via `LoopContext`.

class ReceiverOrigin {
  // Walks a (possibly chained) MemberExpression down to its root Identifier. Any other
  // root shape returns undefined, and the caller's default is to keep flagging.
  public static findRootIdentifier(node: unknown): Rule.Node | undefined {
    let current: unknown = node;

    while (AstHelpers.isNode(current)) {
      if (current.type === 'Identifier') {
        return current;
      }
      if (current.type !== 'MemberExpression') {
        return undefined;
      }
      current = AstHelpers.getNodeProperty(current, 'object');
    }

    return undefined;
  }

  // Resolves `identifierNode` to its declaring AST node by walking up the lexical scope
  // chain by name — the standard identifier-resolution algorithm.
  public static findDeclarationNode(identifierNode: Rule.Node, context: Rule.RuleContext): Rule.Node | undefined {
    const rawName = AstHelpers.getNodeProperty(identifierNode, 'name');

    if (typeof rawName !== 'string') {
      return undefined;
    }
    const name = rawName;
    let scope: Scope.Scope | null = context.sourceCode.getScope(identifierNode);

    while (scope !== null) {
      const { variables } = scope;
      const variablesLength = variables.length;

      for (let index = 0; index < variablesLength; index += 1) {
        const candidate = variables.at(index);

        if (candidate?.name === name) {
          const definitionNode = candidate.defs.at(0)?.node;
          const result = AstHelpers.isNode(definitionNode) ? definitionNode : undefined;

          return result;
        }
      }
      scope = scope.upper;
    }

    return undefined;
  }

  // Proven loop-local when the declaration site falls within the enclosing loop's own AST
  // range — freshly derived every iteration, not the same collection re-scanned.
  public static isProvenLoopLocal(receiverObject: unknown, loopNode: Rule.Node, context: Rule.RuleContext): boolean {
    const rootIdentifier = ReceiverOrigin.findRootIdentifier(receiverObject);

    if (rootIdentifier === undefined) {
      return false;
    }

    const declarationNode = ReceiverOrigin.findDeclarationNode(rootIdentifier, context);

    if (declarationNode === undefined) {
      return false;
    }

    const declRange = declarationNode.range;
    const loopRange = loopNode.range;

    if (declRange !== undefined && loopRange !== undefined) {
      const [declStart, declEnd] = declRange;
      const [loopStart, loopEnd] = loopRange;
      const result = declStart >= loopStart && declEnd <= loopEnd;

      return result;
    }

    return false;
  }
}

class LoopRange {
  // Nearest enclosing real loop keyword, distinct from `LoopContext`'s boolean;
  // stops at a function boundary, including an iteration-callback boundary.
  public static findEnclosingLoop(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (LOOP_TYPES.has(current.type)) {
        return current;
      }
      if (FUNCTION_TYPES.has(current.type)) {
        return undefined;
      }
      current = current.parent;
    }

    return undefined;
  }
}

export const arrayScanOutsideLoops: Rule.RuleModule = {
  'create': (context) => {
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (!CallIdentity.isBuiltinCall(node, context, SCAN_METHODS, SCAN_OWNERS)) {
        return;
      }
      if (!LoopContext.isPerIteration(node, context)) {
        return;
      }

      const loopNode = LoopRange.findEnclosingLoop(node);

      if (loopNode !== undefined) {
        const { callee } = node;

        if (callee.type === 'MemberExpression' && ReceiverOrigin.isProvenLoopLocal(callee.object, loopNode, context)) {
          return;
        }
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return { 'CallExpression': onCallExpression };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'forbidden': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
