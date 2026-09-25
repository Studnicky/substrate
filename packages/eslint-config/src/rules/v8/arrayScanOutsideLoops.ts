import type { Rule } from 'eslint';

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
    let current = node;

    while (current !== null && typeof current === 'object') {
      const raw = current as Record<string, unknown>;

      if (raw.type === 'Identifier') {
        return current as Rule.Node;
      }
      if (raw.type !== 'MemberExpression') {
        return undefined;
      }
      current = raw.object;
    }

    return undefined;
  }

  // Resolves `identifierNode` to its declaring AST node by walking up the lexical scope
  // chain by name — the standard identifier-resolution algorithm.
  public static findDeclarationNode(identifierNode: Rule.Node, context: Rule.RuleContext): Rule.Node | undefined {
    const name = (identifierNode as unknown as { readonly 'name': string }).name;
    let scope = context.sourceCode.getScope(identifierNode) as { readonly 'upper': typeof scope | null; readonly 'variables': readonly { readonly 'defs': readonly { readonly 'node': unknown }[]; readonly 'name': string }[] } | null;

    while (scope !== null) {
      const { variables } = scope;
      const variablesLength = variables.length;

      for (let index = 0; index < variablesLength; index += 1) {
        const candidate = variables.at(index);

        if (candidate?.name === name) {
          const result = candidate.defs.at(0)?.node as Rule.Node | undefined;
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
