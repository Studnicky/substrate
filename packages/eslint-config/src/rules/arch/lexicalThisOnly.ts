import type { Rule } from 'eslint';

class LegitimateThisUse {
  public static check(node: Rule.Node): boolean {
    const parent = node.parent as Rule.Node | undefined;

    if (parent === undefined) {
      return true;
    }

    if (parent.type === 'MemberExpression' && parent.object === node) {
      return true;
    }

    if (parent.type === 'ReturnStatement' && parent.argument === node) {
      return true;
    }

    return false;
  }
}

export const lexicalThisOnly: Rule.RuleModule = {
  'create': (context) => {
    const onThisExpression: NonNullable<Rule.RuleListener['ThisExpression']> = (node) => {
      if (!LegitimateThisUse.check(node)) {
        context.report({
          'messageId': 'alias',
          'node': node
        });
      }
    };

    return {
      'ThisExpression': onThisExpression
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
