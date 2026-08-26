import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { withStatement } from '../../../src/rules/v8/withStatement.js';
import scenarioGroups from './withStatement.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

// `withStatement` is confirmed PASS by adversarial review — no bypass, selector is
// a bare `WithStatement` match which is intrinsically unavoidable in non-strict-mode
// JS. This file is a permanent regression test only; the rule itself is unmodified.
const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'script' } }
});

void describe('with-statement', () => {
  void it('validates with-statement scenarios', () => {
    ruleTester.run('with-statement', withStatement, scenarioGroups);
  });
});
