import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noProjectInternalAcronyms } from '../../src/rules/noProjectInternalAcronyms.js';

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

ruleTester.run('no-project-internal-acronyms', noProjectInternalAcronyms, {
  'valid': [
    // Whitelisted acronym token — HTTP is a recognized spec term.
    {
      'code': 'const httpClient = 1;',
      'name': 'whitelisted acronym httpClient — no report'
    },
    // Whitelisted compound identifier — JsonValue is preserved as-is.
    {
      'code': 'interface JsonValue { readonly x: number; }',
      'name': 'whitelisted JsonValue interface — no report'
    },
    // Loop iterators i/j/k are exempt.
    {
      'code': 'for (let i = 0; i < 10; i += 1) { void i; }',
      'name': 'loop iterator i — no report'
    },
    {
      'code': 'for (let j = 0; j < 10; j += 1) { void j; }',
      'name': 'loop iterator j — no report'
    },
    {
      'code': 'for (let k = 0; k < 10; k += 1) { void k; }',
      'name': 'loop iterator k — no report'
    },
    // Non-computed property access on an external API — Math.max is a member
    // expression property, not a project-owned identifier.
    {
      'code': 'const n = Math.max(1, 2); void n;',
      'name': 'external member expression property Math.max — no report'
    },
    {
      'code': 'const list = Array.from([1, 2, 3]); void list;',
      'name': 'external member expression property Array.from — no report'
    }
  ],
  'invalid': [
    // Variable declarator with a banned shortening.
    {
      'code': 'const cfg = {};',
      'errors': [{ 'messageId': 'banned-shortening' }],
      'name': 'variable cfg — flagged'
    },
    // Function declaration with a banned shortening.
    {
      'code': 'function getCtx(): void {}',
      'errors': [{ 'messageId': 'banned-shortening' }],
      'name': 'function getCtx — flagged'
    },
    // Class property with a banned shortening.
    {
      'code': 'class A { opts: string = ""; }',
      'errors': [{ 'messageId': 'banned-shortening' }],
      'name': 'class property opts — flagged'
    }
  ]
});
