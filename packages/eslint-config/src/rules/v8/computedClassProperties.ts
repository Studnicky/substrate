import type { Rule } from 'eslint';

import { Predicates } from '#runtime';

import { AstHelpers } from '../shared/astHelpers.js';
import {
  FUNCTION_TYPES, LOOP_TYPES
} from '../shared/constants/LoopContextConstants.js';
import {
  MESSAGE, RULE_NAME
} from './constants/ComputedClassPropertiesConstants.js';

// See docs/eslint/rules/v8/computed-class-properties.md for the measured rationale.

class KeyClassification {
  /** A well-known symbol computed key (`[Symbol.iterator]`, `[Symbol.asyncIterator]`, …) — a compile-time constant with no non-computed spelling. */
  public static isWellKnownSymbol(keyNode: unknown): boolean {
    if (!Predicates.isRecord(keyNode) || keyNode.type !== 'MemberExpression') {
      return false;
    }

    const result = AstHelpers.getIdentifierName(keyNode.object) === 'Symbol';
    return result;
  }

  /** A literal computed key (`['fixedName']`) — resolved once, identical every time the enclosing class evaluates. */
  public static isLiteral(keyNode: unknown): boolean {
    const result = AstHelpers.getNodeType(keyNode) === 'Literal';
    return result;
  }
}

class RecurringScope {
  /** True when `classNode` is lexically nested inside a function or loop — i.e. it can be re-evaluated, minting a distinct runtime class each time. */
  public static wraps(classNode: Rule.Node): boolean {
    let current: Rule.Node | null = classNode.parent;

    while (current !== null) {
      if (FUNCTION_TYPES.has(current.type) || LOOP_TYPES.has(current.type)) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }
}

class ClassMemberScope {
  /** Nearest enclosing `ClassDeclaration`/`ClassExpression` of a class member node. */
  public static findEnclosingClass(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (current.type === 'ClassDeclaration' || current.type === 'ClassExpression') {
        return current;
      }
      current = current.parent;
    }

    return undefined;
  }
}

export const computedClassProperties: Rule.RuleModule = {
  'create': (context) => {
    const checkMember: (node: Rule.Node) => void = (node) => {
      const key = AstHelpers.getNodeProperty(node, 'key');

      if (KeyClassification.isWellKnownSymbol(key) || KeyClassification.isLiteral(key)) {
        return;
      }

      const classNode = ClassMemberScope.findEnclosingClass(node);

      if (classNode === undefined || !RecurringScope.wraps(classNode)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return {
      'ClassBody > MethodDefinition[computed=true]': checkMember,
      'ClassBody > PropertyDefinition[computed=true]': checkMember
    };
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
