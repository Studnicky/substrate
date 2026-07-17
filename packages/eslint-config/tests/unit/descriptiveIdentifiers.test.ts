import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter, RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { descriptiveIdentifiers } from '../../src/rules/descriptiveIdentifiers.js';

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

ruleTester.run('descriptive-identifiers', descriptiveIdentifiers, {
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
    },
    // Barrel re-export — the original declaration site already reports this
    // identifier; the re-export must not produce a duplicate.
    {
      'code': "export { cfg } from './config.js';",
      'name': 're-exported cfg through a barrel — no duplicate report'
    },
    {
      'code': "export { cfg as config } from './config.js';",
      'name': 're-exported and renamed cfg through a barrel — no duplicate report'
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

describe('descriptive-identifiers — CamelCase.split performance', () => {
  it('does not exhibit polynomial blowup on a long uppercase run followed by a digit', () => {
    // Regression test for a ReDoS in CamelCase's former regex-based
    // tokenizer: an uppercase run immediately followed by a non-letter
    // (here a digit) that isn't the end of the identifier forced the
    // engine to backtrack the greedy `[A-Z]+` one character at a time at
    // every starting position within the run, which is quadratic in the
    // run's length.
    const name = `${'A'.repeat(50_000)}1x`;
    const linter = new Linter();

    const start = Date.now();

    linter.verify(`const ${name} = 1; void ${name};`, {
      'languageOptions': { 'ecmaVersion': 2024, 'sourceType': 'module' },
      'plugins': { 'local': { 'rules': { 'descriptive-identifiers': descriptiveIdentifiers } } },
      'rules': { 'local/descriptive-identifiers': 'error' }
    });

    const elapsedMs = Date.now() - start;

    assert.ok(
      elapsedMs < 1000,
      `expected linting a pathological identifier to stay well under 1s, took ${elapsedMs}ms`
    );
  });
});
