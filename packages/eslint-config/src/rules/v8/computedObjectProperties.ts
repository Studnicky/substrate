import type { Rule } from 'eslint';

import { Predicates } from '@studnicky/types/browser';

import { AstHelpers } from '../shared/astHelpers.js';
import {
  MESSAGE, RULE_NAME
} from './constants/ComputedObjectPropertiesConstants.js';

// See docs/eslint/rules/v8/computed-object-properties.md for the measured rationale.

class KeyClassification {
  /** A well-known symbol computed key (`[Symbol.iterator]`, `[Symbol.asyncIterator]`, …) — a compile-time constant with no non-computed spelling. See module comment for the measured-but-exempt trade-off. */
  public static isWellKnownSymbol(keyNode: unknown): boolean {
    if (!Predicates.isRecord(keyNode) || keyNode.type !== 'MemberExpression') {
      return false;
    }

    const result = AstHelpers.getIdentifierName(keyNode.object) === 'Symbol';
    return result;
  }
}

class FromEntriesCallShape {
  /** `Object.fromEntries(...)` — resolved by direct callee shape, matching this file's existing convention (no `CallIdentity` dependency for a global static method with no realistic same-named user overload). */
  public static isObjectFromEntries(node: Rule.Node): boolean {
    const callee = AstHelpers.getNodeProperty(node, 'callee');

    if (!Predicates.isRecord(callee) || callee.type !== 'MemberExpression' || callee.computed === true) {
      return false;
    }

    const objectNode = callee.object;
    const propertyNode = callee.property;

    if (!Predicates.isRecord(objectNode) || objectNode.type !== 'Identifier' || objectNode.name !== 'Object') {
      return false;
    }
    if (!Predicates.isRecord(propertyNode) || propertyNode.type !== 'Identifier' || propertyNode.name !== 'fromEntries') {
      return false;
    }

    return true;
  }
}

export const computedObjectProperties: Rule.RuleModule = {
  'create': (context) => {
    const onComputedProperty: (node: Rule.Node) => void = (node) => {
      const key = AstHelpers.getNodeProperty(node, 'key');

      if (KeyClassification.isWellKnownSymbol(key)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (!FromEntriesCallShape.isObjectFromEntries(node)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return {
      'CallExpression': onCallExpression,
      'ObjectExpression > Property[computed=true]': onComputedProperty
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
