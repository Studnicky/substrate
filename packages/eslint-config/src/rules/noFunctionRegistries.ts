import type { Rule } from 'eslint';

export const noFunctionRegistries: Rule.RuleModule = {
  'create': (context) => {
    const onObjectExpression: NonNullable<Rule.RuleListener['ObjectExpression']> = (node) => {
      let functionPropertyCount = 0;
      for (let index = 0; index < node.properties.length; index += 1) {
        const property = node.properties[index];
        if (property?.type !== 'Property') {
          continue;
        }
        if (property.value.type === 'ArrowFunctionExpression' || property.value.type === 'FunctionExpression') {
          functionPropertyCount += 1;
        }
      }
      if (functionPropertyCount < 2) {
        return;
      }
      context.report({
        'messageId': 'functionRegistry',
        'node': node
      });
    };

    return { 'ObjectExpression': onObjectExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow object literals that aggregate multiple function implementations.',
      'recommended': false
    },
    'messages': {
      'functionRegistry': 'Function registries are forbidden. Move each function implementation to an independently named module or class.'
    },
    'schema': [],
    'type': 'problem'
  }
};
