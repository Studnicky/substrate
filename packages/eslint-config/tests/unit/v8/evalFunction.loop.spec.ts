import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { evalFunction } from '../../../src/rules/v8/evalFunction.js';
import scenarioGroups from './evalFunction.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

void describe('eval-function', () => {
  void it('validates eval-function scenarios', () => {
    ruleTester.run('eval-function', evalFunction, scenarioGroups);
  });

  // The zero-expressions guard inside `isEvalSequenceExpression` defends against a
  // malformed AST — a real `SequenceExpression` (the comma operator) always carries at
  // least two expressions, so that branch is not reachable through real source.
  void it('covers remaining guard exits over real source', () => {
    ruleTester.run('eval-function', evalFunction, {
      'invalid': [],
      'valid': [
        { 'code': 'const {} = eval;', 'name': 'a non-Identifier destructuring id aliasing eval - not tracked' },
        { 'code': 'const notEval = 1;', 'name': 'an Identifier initialized from a non-eval value - not tracked' },
        { 'code': 'somethingElse();', 'name': 'a call to an untracked, non-eval identifier' },
        { 'code': 'declare const obj: { eval(code: string): unknown }; obj.eval("1");', 'name': 'a member call named eval on a non-global object' },
        { 'code': 'declare const NotFunction: new () => unknown; new NotFunction();', 'name': 'a NewExpression whose callee is not named Function' }
      ]
    });
  });
});
