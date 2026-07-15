import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { constantsFolderRequired } from '../../src/rules/constantsFolderRequired.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    }
  }
});

ruleTester.run('constants-folder-required', constantsFolderRequired, {
  'valid': [
    {
      'code': 'export const MAX_RETRIES = 3;',
      'filename': '/project/src/http/client.ts',
      'name': 'single top-level const — not flagged'
    },
    {
      'code': 'const Schema = {}; export const validate = (): boolean => true;',
      'filename': '/project/src/schemas/thing.ts',
      'name': 'two consts but one is exempt (Schema) — only one real const remains, not flagged'
    },
    {
      'code': 'export const ajv = {}; const compiledValidator = (): boolean => true;',
      'filename': '/project/src/schemas/other.ts',
      'name': 'all consts are exempt names — not flagged'
    },
    {
      'code': 'export const ALPHA = 1; export const BETA = 2; export const GAMMA = 3;',
      'filename': '/project/src/constants/values.ts',
      'name': 'file under constants/ path — exempt regardless of const count'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'filename': '/project/src/entities/Foo.ts',
      'name': 'file under entities/ path — exempt'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'filename': '/project/tests/unit/foo.test.ts',
      'name': 'file under tests/ path — exempt'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'filename': '/project/packages/eslint-config/src/rules/someRule.ts',
      'name': 'file under eslint-config/ package path — exempt'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'filename': '/project/eslint.config.mjs',
      'name': 'eslint.config.mjs — exempt'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'filename': '/project/src/index.ts',
      'name': 'index.ts — exempt'
    },
    {
      'code': 'let a = 1; a = 2; function f(): void {}',
      'filename': '/project/src/other.ts',
      'name': 'no top-level const declarations — not flagged'
    },
    {
      'code': 'export const handleClick = (): void => {}; export const handleSubmit = (): void => {};',
      'filename': '/project/src/components/Button.ts',
      'name': 'two top-level function consts — not flagged (functions are not data constants)'
    },
    {
      'code': 'export const MAX = 3; export const handler = (): void => {};',
      'filename': '/project/src/http/handlers.ts',
      'name': 'one data const and one function const — only one real const remains, not flagged'
    },
    {
      'code': 'export const { ALPHA } = CONFIG;',
      'filename': '/project/src/http/single.ts',
      'name': 'destructured object pattern with one bound name — not flagged'
    }
  ],
  'invalid': [
    {
      'code': 'export const TIMEOUT_MS = 1000; export const MAX_RETRIES = 3;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/http/client.ts',
      'name': 'two top-level non-exempt consts — flagged once, listing both names'
    },
    {
      'code': 'const A = 1; const B = 2; const C = 3;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/values.ts',
      'name': 'three top-level non-exempt consts — flagged once'
    },
    {
      'code': 'export const CONFIG = {}; const OTHER = 2;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/mixed.ts',
      'name': 'mix of exported and non-exported top-level consts — flagged'
    },
    {
      'code': 'export const MAX_RETRIES = 3; export const TIMEOUT_MS = 1000; export const onClick = (): void => {};',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/http/mixedWithFunction.ts',
      'name': 'two data consts plus a function const — still flagged for the two data consts'
    },
    {
      'code': 'export const { ALPHA, BETA, GAMMA } = CONFIG;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/http/destructuredObject.ts',
      'name': 'destructured object pattern introducing three names — flagged'
    },
    {
      'code': 'export const [a, b, c] = arr;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/http/destructuredArray.ts',
      'name': 'destructured array pattern introducing three names — flagged'
    }
  ]
});
