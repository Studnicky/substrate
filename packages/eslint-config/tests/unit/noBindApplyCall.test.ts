import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noBindApplyCall } from '../../src/rules/noBindApplyCall.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts']
      },
      'tsconfigRootDir': '/Users/studs/Workspace/noocodec-substrate'
    }
  }
});

ruleTester.run('no-bind-apply-call', noBindApplyCall, {
  'valid': [
    // Class instance with an `apply` method — receiver is not callable, must NOT report.
    {
      'code': 'class P { apply(x: number): void { void x; } } const p = new P(); p.apply(1);',
      'name': 'class instance with apply method — not a Function, no report'
    },
    // Class instance with a `call` method.
    {
      'code': 'class Q { call(x: number): void { void x; } } const q = new Q(); q.call(2);',
      'name': 'class instance with call method — not a Function, no report'
    },
    // Class instance with a `bind` method.
    {
      'code': 'class R { bind(x: number): void { void x; } } const r = new R(); r.bind(3);',
      'name': 'class instance with bind method — not a Function, no report'
    },
    // Plain object literal with an `apply` method — not a Function.
    {
      'code': 'const o = { apply(n: number): void { void n; } }; o.apply(4);',
      'name': 'plain object with apply method — not callable, no report'
    },
    // `any`-typed receiver — `any` has no call signatures, cannot prove callable, no report.
    {
      'code': 'const a: any = {}; a.apply(null);',
      'name': 'any-typed receiver — unprovable, no report'
    },
    // Normal method call unrelated to bind/call/apply.
    {
      'code': 'declare const obj: { run(): void }; obj.run();',
      'name': 'normal non-bind method call — no report'
    }
  ],
  'invalid': [
    // Named function reference — receiver is callable, .apply is Function.prototype.apply.
    {
      'code': 'function f(x: number, y: number): void { void x; void y; } f.apply(null, [1, 2]);',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'function declaration .apply — forbidden'
    },
    // Arrow function constant — callable receiver.
    {
      'code': 'const g = (): void => {}; g.bind(null);',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'arrow function .bind — forbidden'
    },
    // Function expression — callable receiver.
    {
      'code': 'const h = function (): void {}; h.call(undefined);',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'function expression .call — forbidden'
    },
    // Computed member access with literal string 'apply' on a function.
    {
      'code': "function k(): void {} k['apply'](null, []);",
      'errors': [{ 'messageId': 'forbidden' }],
      'name': "computed k['apply'] on function declaration — forbidden"
    }
  ]
});
