import type { Rule } from 'eslint';

import { ASSERTION_TYPES, WIDENING_KEYWORDS } from '../constants/NoDoubleAssertionConstants.js';
import { AstHelpers } from '../shared/astHelpers.js';

// A DOUBLE ASSERTION MAKES A WRONG SHAPE UNFALSIFIABLE. TypeScript's single-step `as`
// requires the source and target types to overlap; routing through `unknown`/`any` first
// bypasses that check entirely, so a mistaken assumption about a value's shape compiles clean.

class DoubleAssertionShape {
  public static isDoubleAssertion(node: Rule.Node): boolean {
    const expression = AstHelpers.getNodeProperty(node, 'expression');

    if (!AstHelpers.isNode(expression) || !ASSERTION_TYPES.has(expression.type)) {
      return false;
    }

    const innerTarget = AstHelpers.getNodeProperty(expression, 'typeAnnotation');
    const result = AstHelpers.isNode(innerTarget) && WIDENING_KEYWORDS.has(innerTarget.type);

    return result;
  }
}

export const noDoubleAssertion: Rule.RuleModule = {
  'create': (context) => {
    const inspect = (node: Rule.Node): void => {
      if (!DoubleAssertionShape.isDoubleAssertion(node)) {
        return;
      }

      context.report({ 'messageId': 'doubleAssertion', 'node': node });
    };

    return { 'TSAsExpression': inspect, 'TSTypeAssertion': inspect };
  },
  'meta': {
    'docs': {
      'description': 'Disallow an assertion chain routed through `unknown` or `any` to reach an unrelated type.',
      'recommended': false
    },
    'messages': {
      'doubleAssertion': 'A double assertion through `unknown`/`any` bypasses the overlap check a single `as` requires, so a wrong assumption about this value\'s shape compiles clean. Parse it through a real boundary instead of forcing its type.'
    },
    'schema': [],
    'type': 'problem'
  }
};
