import type { Rule } from 'eslint';

class ThisExpressionNode {
  public static is(node: unknown): boolean {
    if (node === null || node === undefined) {
      return false;
    }
    if (typeof node !== 'object') {
      return false;
    }

    return Reflect.get(node, 'type') === 'ThisExpression';
  }
}

export const lexicalThisOnly: Rule.RuleModule = {
  'create': (context) => {
    const onAssignmentExpression: NonNullable<Rule.RuleListener['AssignmentExpression']> = (node) => {
      if (ThisExpressionNode.is(node.right)) {
        context.report({
          'messageId': 'alias',
          'node': node
        });
      }
    };

    const onVariableDeclarator: NonNullable<Rule.RuleListener['VariableDeclarator']> = (node) => {
      if (ThisExpressionNode.is(node.init)) {
        context.report({
          'messageId': 'alias',
          'node': node
        });
      }
    };

    return {
      'AssignmentExpression': onAssignmentExpression,
      'VariableDeclarator': onVariableDeclarator
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow aliasing `this` to another variable or assignment.',
      'recommended': false
    },
    'messages': { 'alias': 'Aliasing `this` is forbidden. Use lexical `this` (arrow functions) instead.' },
    'schema': [],
    'type': 'problem'
  }
};
