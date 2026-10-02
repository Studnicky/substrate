import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { regexpInLoops } from '../../../src/rules/v8/regexpInLoops.js';
import scenarioGroups from './regexpInLoops.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

void describe('regexp-in-loops', () => {
  void it('validates regexp-in-loops scenarios', () => {
    ruleTester.run('regexp-in-loops', regexpInLoops, scenarioGroups);
  });

  // `hasRegExpCallee`'s `!Predicates.isRecord(callee)` guard defends against a malformed AST —
  // a real Call/NewExpression callee is always a record — so that branch is not reachable
  // through real source, and neither is `isRegExpLiteral` seeing a matched `Literal[regex]`
  // node whose `regex` is undefined (the esquery selector only matches literals that have one).
  void it('ignores non-RegExp callee shapes over real source', () => {
    ruleTester.run('regexp-in-loops', regexpInLoops, {
      'invalid': [],
      'valid': [
        { 'code': 'new Date();', 'name': 'a NewExpression whose callee is an Identifier, but not named RegExp' },
        {
          'code': 'declare function getCtor(): new () => unknown; new (getCtor())();',
          'name': 'a NewExpression whose callee is not an Identifier at all'
        }
      ]
    });
  });
});
