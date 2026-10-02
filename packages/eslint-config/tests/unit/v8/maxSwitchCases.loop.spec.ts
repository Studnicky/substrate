import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { maximumSwitchCases } from '../../../src/rules/v8/maximumSwitchCases.js';
import scenarioGroups from './maximumSwitchCases.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

// The rule's `!Array.isArray(cases)` guard defends against a malformed AST — a real
// `SwitchStatement` from any parser always carries `cases: SwitchCase[]`, so that
// branch is not reachable through real source and is not exercised here.
void describe('max-switch-cases', () => {
  void it('validates max-switch-cases scenarios', () => {
    ruleTester.run('max-switch-cases', maximumSwitchCases, scenarioGroups);
  });
});
