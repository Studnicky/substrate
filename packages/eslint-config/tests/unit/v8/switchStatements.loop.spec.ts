import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { switchStatements } from '../../../src/rules/v8/switchStatements.js';
import scenarioGroups from './switchStatements.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

void describe('switch-statements', () => {
  void it('validates switch-statements scenarios', () => {
    ruleTester.run('switch-statements', switchStatements, scenarioGroups);
  });
});
