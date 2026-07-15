import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { requireOptionsObject } from '../../src/rules/requireOptionsObject.js';

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

const validScenarios = [
  {
    name: 'single optional param — fine',
    code: `function foo(name: string, age?: number) {}`
  },
  {
    name: 'trailing options object — already correct',
    code: `function foo(name: string, opts?: { age?: number; role?: string }) {}`
  },
  {
    name: 'all required params — fine',
    code: `function foo(name: string, age: number) {}`
  },
  {
    name: 'rest parameter — never flag',
    code: `function foo(name: string, ...args: string[]) {}`
  },
  {
    name: 'destructured param — never flag',
    code: `function foo(name: string, { a, b }: { a: string; b: number }) {}`
  },
  {
    name: 'method with options object',
    code: `class Foo { bar(name: string, opts?: { x?: number; y?: string }) {} }`
  },
  {
    name: 'single default value — fine',
    code: `function foo(name: string, age = 0) {}`
  },
  {
    name: 'arrow with trailing options object',
    code: `const fn = (name: string, opts?: { a?: string }) => {};`
  },
  {
    name: 'no params — fine',
    code: `function foo() {}`
  },
  {
    name: 'destructured with default — never flag',
    code: `function foo(name: string, { a, b } = { a: '', b: 0 }) {}`
  },
  {
    name: 'TSFunctionType with 0 or 1 optional params — fine',
    code: `type Handler = (a: string, b?: number) => void;`
  }
];

type InvalidScenarioType = {
  readonly code: string;
  readonly errors: ReadonlyArray<{ readonly messageId: string }>;
  readonly name: string;
};

const invalidScenarios: InvalidScenarioType[] = [
  {
    name: '2 standalone optional params — flag',
    code: `function foo(name: string, age?: number, role?: string) {}`,
    errors: [{ messageId: 'requireOptionsObject' }]
  },
  {
    name: '2 default params — flag',
    code: `function foo(name: string, age = 0, role = '') {}`,
    errors: [{ messageId: 'requireOptionsObject' }]
  },
  {
    name: 'mixed required and 2+ optionals — flag',
    code: `function foo(a: string, b?: number, c?: boolean, d?: string) {}`,
    errors: [{ messageId: 'requireOptionsObject' }]
  },
  {
    name: 'arrow function with 2 optionals — flag',
    code: `const fn = (name: string, age?: number, role?: string) => {};`,
    errors: [{ messageId: 'requireOptionsObject' }]
  },
  {
    name: '3 all-optional params — flag',
    code: `function foo(a?: string, b?: number, c?: boolean) {}`,
    errors: [{ messageId: 'requireOptionsObject' }]
  },
  {
    name: 'standalone TSFunctionType alias with 2+ optionals — flag',
    code: `type Handler = (a?: string, b?: string, c?: string) => void;`,
    errors: [{ messageId: 'requireOptionsObject' }]
  },
  {
    name: 'interface property signature typed as function with 2+ optionals — flag',
    code: `interface Foo { onEvent?: (a?: string, b?: string) => void; }`,
    errors: [{ messageId: 'requireOptionsObject' }]
  }
];

ruleTester.run('require-options-object', requireOptionsObject, {
  invalid: invalidScenarios,
  valid: validScenarios
});
