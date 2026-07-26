import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { cleanDiagnostics } from '../../src/rules/cleanDiagnostics.js';
import scenarioGroups from './cleanDiagnostics.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

void describe('clean-diagnostics', () => {
  void it('validates clean-diagnostics scenarios', () => {
    ruleTester.run('clean-diagnostics', cleanDiagnostics, scenarioGroups);
  });
});
