import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noFreestandingVerbNoun } from '../../src/rules/noFreestandingVerbNoun.js';

// Workspace root — projectService resolves tsconfig for type-aware ('typed' mode) tests.
const repoRoot = resolve(import.meta.dirname, '../../../..');

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

const typedRuleTester = new RuleTester({
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

// -- 'any' mode: no exemptions, only module-scope gating applies --
ruleTester.run('no-freestanding-verb-noun (any mode)', noFreestandingVerbNoun, {
  valid: [
    {
      name: 'nested function — not at module scope',
      code: `class Builder { static of() { function helper() { return 1; } return helper; } }`,
      options: [{ mode: 'any' }]
    },
    {
      name: 'arrow inside class method — not at module scope',
      code: `class Foo { run() { const local = () => 1; return local(); } }`,
      options: [{ mode: 'any' }]
    }
  ],
  invalid: [
    {
      name: 'trivial one-line pass-through function IS flagged in any mode',
      code: `export function identity(x) { return x; }`,
      options: [{ mode: 'any' }],
      errors: [{ messageId: 'freestandingFunction' }]
    },
    {
      name: 'non-trivial multi-statement function IS flagged in any mode',
      code: `export function compute(x) { const y = x + 1; return y; }`,
      options: [{ mode: 'any' }],
      errors: [{ messageId: 'freestandingFunction' }]
    }
  ]
});

// -- 'structural' mode (also the default when mode is omitted) --
ruleTester.run('no-freestanding-verb-noun (structural mode)', noFreestandingVerbNoun, {
  valid: [
    {
      name: 'trivial single-return body — exempt (structural, explicit)',
      code: `export function foo(x: string): string { return x; }`,
      options: [{ mode: 'structural' }]
    },
    {
      name: 'trivial single-return body — exempt (default mode, omitted)',
      code: `export function foo(x: string): string { return x; }`
    },
    {
      name: 'expression-bodied arrow with trivial body — exempt',
      code: `export const foo = (x: string): string => x;`,
      options: [{ mode: 'structural' }]
    },
    {
      name: 'single-return argument is a delegating call expression — exempt',
      code: `export function foo(x: string): string { return bar(x); }`,
      options: [{ mode: 'structural' }]
    },
    {
      name: 'class static method — not freestanding',
      code: `class Foo { static make() { return {}; } }`,
      options: [{ mode: 'structural' }]
    },
    {
      name: 'nested (non-module-scope) function — never flagged',
      code: `class Builder { static of() { function helper() { const y = {}; return y; } return helper; } }`,
      options: [{ mode: 'structural' }]
    }
  ],
  invalid: [
    {
      name: 'multi-statement body — flagged',
      code: `export function foo(x: string): string { const y = x; return y; }`,
      options: [{ mode: 'structural' }],
      errors: [{ messageId: 'freestandingFunction' }]
    },
    {
      name: 'expression-bodied arrow constructing an object — flagged (non-trivial)',
      code: `export const foo = (x: string) => ({ value: x });`,
      options: [{ mode: 'structural' }],
      errors: [{ messageId: 'freestandingFunction' }]
    },
    {
      name: 'expression-bodied arrow with a binary expression — flagged (non-trivial)',
      code: `export const foo = (x: number) => x + 1;`,
      options: [{ mode: 'structural' }],
      errors: [{ messageId: 'freestandingFunction' }]
    },
    {
      name: 'single statement that is not a ReturnStatement — flagged (real control flow)',
      code: `export function foo(x: string): string { if (x) { throw new Error(x); } return x; }`,
      options: [{ mode: 'structural' }],
      errors: [{ messageId: 'freestandingFunction' }]
    },
    {
      name: 'unexported top-level const arrow — still module scope, flagged',
      code: `const foo = (x: number) => ({ value: x });`,
      options: [{ mode: 'structural' }],
      errors: [{ messageId: 'freestandingFunction' }]
    },
    {
      name: 'unexported top-level function declaration — still module scope, flagged',
      code: `function foo(x: number) { const y = { value: x }; return y; }`,
      options: [{ mode: 'structural' }],
      errors: [{ messageId: 'freestandingFunction' }]
    }
  ]
});

// -- 'typed' mode: type-aware, requires projectService --
typedRuleTester.run('no-freestanding-verb-noun (typed mode)', noFreestandingVerbNoun, {
  valid: [
    {
      name: 'primitive return type (string) — not flagged',
      code: `export function foo(x: string): string { return x; }`,
      options: [{ mode: 'typed' }]
    },
    {
      name: 'primitive return type (number) — not flagged',
      code: `export function foo(x: number): number { return x; }`,
      options: [{ mode: 'typed' }]
    },
    {
      name: 'primitive return type (boolean) — not flagged',
      code: `export function foo(x: boolean): boolean { return x; }`,
      options: [{ mode: 'typed' }]
    },
    {
      name: 'void return type — not flagged',
      code: `export function foo(): void { console.log('x'); }`,
      options: [{ mode: 'typed' }]
    },
    {
      name: 'inline object-literal return type — no name, not flagged',
      code: `export function foo(x: string): { value: string } { return { value: x }; }`,
      options: [{ mode: 'typed' }]
    }
  ],
  invalid: [
    {
      name: 'return type is a named type alias — flagged',
      code: [
        'type ResultType = { value: string };',
        'export function foo(x: string): ResultType { return { value: x }; }'
      ].join('\n'),
      options: [{ mode: 'typed' }],
      errors: [{ messageId: 'freestandingFunction' }]
    },
    {
      name: 'return type is a named interface — flagged',
      code: [
        'interface ResultI { value: string }',
        'export function foo(x: string): ResultI { return { value: x }; }'
      ].join('\n'),
      options: [{ mode: 'typed' }],
      errors: [{ messageId: 'freestandingFunction' }]
    },
    {
      name: 'const arrow returning a named type alias — flagged',
      code: [
        'type ResultType = { value: string };',
        'export const foo = (x: string): ResultType => ({ value: x });'
      ].join('\n'),
      options: [{ mode: 'typed' }],
      errors: [{ messageId: 'freestandingFunction' }]
    }
  ]
});

// -- module-scope gating across all modes --
(['any', 'structural', 'typed'] as const).forEach((mode) => {
  const tester = mode === 'typed' ? typedRuleTester : ruleTester;

  tester.run(`no-freestanding-verb-noun (module-scope gating, ${mode} mode)`, noFreestandingVerbNoun, {
    valid: [
      {
        name: 'nested function inside a class static method — never flagged',
        code: `class Builder { static of() { function helper() { const y = { v: 1 }; return y; } return helper; } }`,
        options: [{ mode }]
      },
      {
        name: 'nested const arrow inside a method — never flagged',
        code: `class Foo { run() { const local = () => ({ v: 1 }); return local(); } }`,
        options: [{ mode }]
      }
    ],
    invalid: [
      {
        name: 'exported function declaration — checked',
        code: `export function foo() { const y = { v: 1 }; return y; }`,
        options: [{ mode }],
        errors: [{ messageId: 'freestandingFunction' }]
      },
      {
        name: 'exported const arrow — checked',
        code: `export const foo = () => ({ v: 1 });`,
        options: [{ mode }],
        errors: [{ messageId: 'freestandingFunction' }]
      },
      {
        name: 'unexported top-level function declaration — checked',
        code: `function foo() { const y = { v: 1 }; return y; }`,
        options: [{ mode }],
        errors: [{ messageId: 'freestandingFunction' }]
      },
      {
        name: 'unexported top-level const arrow — checked',
        code: `const foo = () => ({ v: 1 });`,
        options: [{ mode }],
        errors: [{ messageId: 'freestandingFunction' }]
      }
    ]
  });
});
