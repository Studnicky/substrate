import type { Rule } from 'eslint';

const isBannedMethod = (node: unknown): boolean => {
  if (node === null || node === undefined) {
    return false;
  }
  if (typeof node !== 'object') {
    return false;
  }

  if (Reflect.get(node, 'type') === 'Identifier') {
    return Reflect.get(node, 'name') === 'bind'
      || Reflect.get(node, 'name') === 'call'
      || Reflect.get(node, 'name') === 'apply';
  }
  if (Reflect.get(node, 'type') === 'Literal') {
    return Reflect.get(node, 'value') === 'bind'
      || Reflect.get(node, 'value') === 'call'
      || Reflect.get(node, 'value') === 'apply';
  }

  return false;
};

const createNoBindApplyCall: NonNullable<Rule.RuleModule['create']> = (context) => {
  const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
    const { callee } = node;

    if (callee.type !== 'MemberExpression') {
      return;
    }
    if (isBannedMethod(callee.property)) {
      context.report({
        'messageId': 'forbidden',
        'node': node
      });
    }
  };

  return { 'CallExpression': onCallExpression };
};

export const noBindApplyCall: Rule.RuleModule = {
  'create': createNoBindApplyCall,
  'meta': {
    'docs': {
      'description': 'Disallow Function.prototype.bind/call/apply usage.',
      'recommended': false
    },
    'messages': { 'forbidden': 'bind/call/apply are forbidden. Refactor to avoid explicit binding.' },
    'schema': [],
    'type': 'problem'
  }
};
