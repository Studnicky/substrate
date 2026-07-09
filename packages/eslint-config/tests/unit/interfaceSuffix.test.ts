import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceSuffix } from '../../src/rules/interfaceSuffix.js';

RuleTester.describe = describe;
RuleTester.it = it;

// Workspace root — projectService resolves the tsconfig and @studnicky/* module
// symbols from here.
const repoRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts']
      },
      'tsconfigRootDir': repoRoot
    }
  }
});

ruleTester.run('interface-suffix', interfaceSuffix, {
  'valid': [
    // Interface name already ends with 'Interface'.
    {
      'code': 'interface FooInterface { readonly x: number; }',
      'name': 'interface name ending with Interface — not flagged'
    },
    // Namespace-nested interfaces are NOT exempt — this one already complies.
    {
      'code': 'namespace X { interface FooInterface { readonly x: number; } }',
      'name': 'namespace-nested interface with the suffix — not flagged'
    }
  ],
  'invalid': [
    // Top-level interface missing the required suffix.
    {
      'code': 'interface Foo { readonly x: number; }',
      'errors': [{ 'messageId': 'missing-interface-suffix' }],
      'name': 'top-level interface missing Interface suffix — flagged'
    },
    // Suffixes are not optional: no namespace exemption.
    {
      'code': 'namespace X { interface Foo { readonly x: number; } }',
      'errors': [{ 'messageId': 'missing-interface-suffix' }],
      'name': 'namespace-nested interface missing Interface suffix — flagged, no exemption'
    }
  ]
});
