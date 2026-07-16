import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { wholeCanonicalTypes } from '../../src/rules/wholeCanonicalTypes.js';

// Workspace root — projectService resolves tsconfig and module symbols from here, required
// for the type-checker-based canonical-type resolution this rule performs.
const repoRoot = resolve(import.meta.dirname, '../../../..');

RuleTester.describe = describe;
RuleTester.it = it;

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

ruleTester.run('whole-canonical-types', wholeCanonicalTypes, {
  'invalid': [
    {
      'code': 'type FooType = { a: number; b: string }; type BarType = Partial<FooType>;',
      'errors': [{ 'messageId': 'noPartialCanonicalType' }],
      'name': "'Partial<X>' on a local canonical type alias — flagged"
    },
    {
      'code': "type FooType = { a: number; b: string }; type BarType = Pick<FooType, 'a'>;",
      'errors': [{ 'messageId': 'noPartialCanonicalType' }],
      'name': "'Pick<X, K>' on a local canonical type alias — flagged"
    },
    {
      'code': "interface FooInterface { a: number; method(): void; } type BarType = Omit<FooInterface, 'a'>;",
      'errors': [{ 'messageId': 'noPartialCanonicalType' }],
      'name': "'Omit<X, K>' on a local canonical interface — flagged"
    },
    {
      'code': 'type FooType = { a: number }; function accept(value: Partial<FooType>): void {}',
      'errors': [{ 'messageId': 'noPartialCanonicalType' }],
      'name': "'Partial<X>' used as a function parameter type — flagged"
    }
  ],
  'valid': [
    {
      'code': 'function accept<T>(value: Partial<T>): void {}',
      'name': "'Partial<T>' on a generic type parameter — not flagged, T is not a canonical owned shape"
    },
    {
      'code': 'type BarType = Partial<{ a: number; b: string }>;',
      'name': "'Partial<{...}>' on an inline object-literal type — not flagged, no named canonical type referenced"
    },
    {
      'code': 'type FooType = { a: number }; type BarType = Required<FooType>;',
      'name': "'Required<X>' — not flagged, not a subsetting utility (does not hide properties)"
    },
    {
      'code': "import type { Rule } from 'eslint'; type BarType = Partial<Rule.RuleModule>;",
      'name': "'Partial<X>' on a type declared in node_modules — not flagged, not a domain shape this codebase owns"
    }
  ]
});
