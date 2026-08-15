import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import { FunctionScope } from './functionScope.js';

class AstHelpers {
  public static hasRegExpCallee(node: Rule.Node): boolean {
    if (node.type !== 'NewExpression' && node.type !== 'CallExpression') {
      return false;
    }

    const raw: unknown = node;

    if (!ObjectGuard.isObject(raw)) {
      return false;
    }

    const callee = raw.callee;

    if (!ObjectGuard.isObject(callee)) {
      return false;
    }

    return callee.type === 'Identifier' && callee.name === 'RegExp';
  }

  // A regex literal (`/foo/g`) allocates a fresh RegExp object on every evaluation,
  // identically to the `new RegExp(...)`/`RegExp(...)` constructor forms above.
  public static isRegExpLiteral(node: Rule.Node): boolean {
    if (node.type !== 'Literal') {
      return false;
    }

    const raw: unknown = node;

    if (!ObjectGuard.isObject(raw)) {
      return false;
    }

    return 'regex' in raw && ObjectGuard.isObject(raw.regex);
  }
}

export const regexpInLoops: Rule.RuleModule = {
  'create': (context) => {
    const onExpression = (node: Rule.Node): void => {
      if (!AstHelpers.hasRegExpCallee(node)) {
        return;
      }

      if (FunctionScope.isInsideLoop(node)) {
        context.report({
          'messageId': 'regexpInLoop',
          'node': node
        });
      }
    };

    const onLiteral = (node: Rule.Node): void => {
      if (!AstHelpers.isRegExpLiteral(node)) {
        return;
      }

      if (FunctionScope.isInsideLoop(node)) {
        context.report({
          'messageId': 'regexpInLoop',
          'node': node
        });
      }
    };

    return {
      'CallExpression': onExpression,
      'Literal[regex]': onLiteral,
      'NewExpression': onExpression
    };
  },
  'meta': {
    'docs': {
      'description': 'Disallow RegExp construction inside loops; allocates a new RegExp object on every iteration.',
      'recommended': false
    },
    'messages': { 'regexpInLoop': 'v8Optimization/regexpInLoops: RegExp construction inside a loop causes per-iteration allocation. Hoist the RegExp to the outer scope.' },
    'schema': [],
    'type': 'problem'
  }
};
