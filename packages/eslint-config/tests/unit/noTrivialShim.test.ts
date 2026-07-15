import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noTrivialShim } from '../../src/rules/noTrivialShim.js';

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
    name: 'multi-statement block body',
    code: `function compute(x: number): number { const doubled = x * 2; return doubled + 1; }`
  },
  {
    name: 'conditional branch',
    code: `function maybeDouble(x: number): number { if (x > 0) { return x * 2; } return x; }`
  },
  {
    name: 'arrow with binary expression body (non-trivial)',
    code: `const add = (a: number, b: number) => a + b;`
  },
  {
    name: 'arrow with multi-statement block body',
    code: `const process = (val: string) => { const trimmed = val.trim(); return trimmed.toUpperCase(); };`
  },
  {
    name: 'factory: single-statement returning object literal (creates new value)',
    code: `function build(): { name: string } { return { name: 'default' }; }`
  },
  {
    name: 'factory: arrow returning object literal expression body',
    code: `const makeObj = () => ({ x: 1 });`
  },
  {
    name: 'factory: arrow returning array literal expression body',
    code: `const makeArr = () => [1, 2, 3];`
  },
  {
    name: 'constructor: returning new instance',
    code: `function create(): Map<string, number> { return new Map(); }`
  },
  {
    name: 'extension seam: class method returning empty object (base default)',
    code: `class Base { protected serializeExtra(): Record<string, unknown> { return {}; } }`
  },
  {
    name: 'accessor: this.X member expression (not a shim)',
    code: `class Foo { getMessage(): string { return this.message; } private message = 'hi'; }`
  },
  {
    name: 'accessor: this.X nested member expression',
    code: `class Foo { getLen(): number { return this.items.length; } private items = []; }`
  },
  {
    name: 'ThisExpression directly (builder pattern)',
    code: `class Builder { setName(name: string): this { this.name = name; return this; } private name = ''; }`
  },
  {
    name: 'object property that is not a function',
    code: `const obj = { value: 42 };`
  },
  {
    name: 'class method with multi-statement logic',
    code: `class Calc { double(x: number): number { const result = x * 2; return result; } }`
  }
];

type InvalidScenarioType = {
  readonly name: string;
  readonly code: string;
  readonly errors: ReadonlyArray<{ readonly messageId: string }>;
  readonly output: string | null;
};

const invalidScenarios: InvalidScenarioType[] = [
  {
    name: 'trivial arrow: expression body returning non-this MemberExpression',
    code: `const getX = (obj: { x: number }) => obj.x;`,
    errors: [{ messageId: 'trivial' }],
    output: `const getX = (obj: { x: number }) => { const result = obj.x; return result; };`
  },
  {
    name: 'trivial arrow: block body returning single CallExpression',
    code: `const wrap = (fn: () => number) => { return fn(); };`,
    errors: [{ messageId: 'trivial' }],
    output: `const wrap = (fn: () => number) => { const result = fn();\nreturn result; };`
  },
  {
    name: 'trivial function declaration: returning Identifier',
    code: `function passThrough(x: number): number { return x; }`,
    errors: [{ messageId: 'trivial' }],
    output: `function passThrough(x: number): number { const result = x;\nreturn result; }`
  },
  {
    name: 'trivial function expression: returning single CallExpression',
    code: `const delegate = function(fn: () => string) { return fn(); };`,
    errors: [{ messageId: 'trivial' }],
    output: `const delegate = function(fn: () => string) { const result = fn();\nreturn result; };`
  },
  {
    name: 'trivial arrow: returning constant literal string',
    code: `const version = () => '1.0.0';`,
    errors: [{ messageId: 'trivial' }],
    output: `const version = () => { const result = '1.0.0'; return result; };`
  },
  {
    name: 'trivial object property arrow: non-this MemberExpression',
    code: `const api = { get: (x: number) => x };`,
    errors: [{ messageId: 'trivial' }, { messageId: 'trivial' }],
    output: `const api = { get: (x: number) => { const result = x; return result; } };`
  },
  {
    name: 'trivial arrow: expression body returning identifier wrapped in satisfies',
    code: `const forward = (x: number) => x satisfies number;`,
    errors: [{ messageId: 'trivial' }],
    output: `const forward = (x: number) => { const result = x satisfies number; return result; };`
  }
];

ruleTester.run('no-trivial-shim', noTrivialShim, {
  invalid: invalidScenarios,
  valid: validScenarios
});
