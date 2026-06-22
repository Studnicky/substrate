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

ruleTester.run('no-trivial-shim', noTrivialShim, {
  valid: [
    // Real logic: multiple statements in block
    {
      code: `
        function compute(x: number): number {
          const doubled = x * 2;
          return doubled + 1;
        }
      `
    },
    // Real logic: conditional branch
    {
      code: `
        function maybeDouble(x: number): number {
          if (x > 0) {
            return x * 2;
          }
          return x;
        }
      `
    },
    // Arrow with non-trivial expression body (BinaryExpression is not trivial)
    {
      code: `const add = (a: number, b: number) => a + b;`
    },
    // Arrow with multiple-statement block body
    {
      code: `
        const process = (val: string) => {
          const trimmed = val.trim();
          return trimmed.toUpperCase();
        };
      `
    },
    // Function with real construction logic (multiple statements)
    {
      code: `
        function build(label: string) {
          const prefix = label.trim();
          return { name: prefix, active: true };
        }
      `
    },
    // Class method with real logic
    {
      code: `
        class Calc {
          double(x: number): number {
            const result = x * 2;
            return result;
          }
        }
      `
    },
    // Object property that is not a function — not checked
    {
      code: `const obj = { value: 42 };`
    },
    // Returning this — ThisExpression is explicitly exempted
    {
      code: `
        class Builder {
          setName(name: string): this {
            return this;
          }
        }
      `
    }
  ],
  invalid: [
    // Trivial arrow with expression body returning a MemberExpression
    {
      code: `const getX = (obj: { x: number }) => obj.x;`,
      errors: [{ messageId: 'trivial' }],
      output: `const getX = (obj: { x: number }) => { const result = obj.x; return result; };`
    },
    // Trivial arrow with block body — single return of CallExpression
    // The fix replaces the return statement; indent is derived from the statement text
    {
      code: `const wrap = (fn: () => number) => { return fn(); };`,
      errors: [{ messageId: 'trivial' }],
      output: `const wrap = (fn: () => number) => { const result = fn();\nreturn result; };`
    },
    // Trivial function declaration — single return of Identifier
    {
      code: `function passThrough(x: number): number { return x; }`,
      errors: [{ messageId: 'trivial' }],
      output: `function passThrough(x: number): number { const result = x;\nreturn result; }`
    },
    // Trivial function expression — single return of CallExpression
    {
      code: `const delegate = function(fn: () => string) { return fn(); };`,
      errors: [{ messageId: 'trivial' }],
      output: `const delegate = function(fn: () => string) { const result = fn();\nreturn result; };`
    },
    // ObjectExpression return — reported WITHOUT autofix (contextual type would be widened)
    {
      code: `const makeObj = () => ({ x: 1 });`,
      errors: [{ messageId: 'trivial' }],
      output: null
    },
    // ArrayExpression return — reported WITHOUT autofix (contextual type would be widened)
    {
      code: `const makeArr = () => [1, 2, 3];`,
      errors: [{ messageId: 'trivial' }],
      output: null
    },
    // Property with arrow expression body — both Property and ArrowFunctionExpression fire
    // Both are reported; the combined output applies both fixes
    {
      code: `const api = { get: (x: number) => x };`,
      errors: [{ messageId: 'trivial' }, { messageId: 'trivial' }],
      output: `const api = { get: (x: number) => { const result = x; return result; } };`
    }
  ]
});
