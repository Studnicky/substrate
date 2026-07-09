import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { maxSwitchCases } from '../../../src/rules/v8/maxSwitchCases.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

const buildSwitch = (caseCount: number): string => {
  let body = 'switch (k) {\n';
  for (let i = 0; i < caseCount; i++) { body += `  case ${i}: return ${i};\n`; }
  body += '  default: return -1;\n}';
  return `function f(k) { ${body} }`;
};

ruleTester.run('max-switch-cases', maxSwitchCases, {
  'valid': [
    {
      'code': buildSwitch(19),
      'name': '19 cases — below the 20-case threshold, switch measured faster, not flagged'
    },
    {
      'code': 'switch (k) { case 0: return 1; default: return -1; }',
      'name': 'trivial 1-case switch — not flagged'
    }
  ],
  'invalid': [
    {
      'code': buildSwitch(20),
      'errors': [{ 'messageId': 'tooManyCases' }],
      'name': '20 cases — at the threshold, dispatch map measured comparable-or-faster, flagged'
    },
    {
      'code': buildSwitch(50),
      'errors': [{ 'messageId': 'tooManyCases' }],
      'name': '50 cases — well above threshold, flagged'
    }
  ]
});
