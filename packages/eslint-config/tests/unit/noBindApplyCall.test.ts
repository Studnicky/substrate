import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noBindApplyCall } from '../../src/rules/noBindApplyCall.js';

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

ruleTester.run('no-bind-apply-call', noBindApplyCall, {
  valid: [
    // Normal method call — not bind/call/apply
    { code: `obj.run();` },
    // Property named bind on non-function context (still a MemberExpression — rule checks property name)
    // A method named "bindData" is fine since property name is not exactly bind/call/apply
    { code: `obj.bindData();` },
    { code: `obj.callback();` },
    { code: `obj.callMe();` },
    { code: `obj.applicant();` },
    // Regular function call (no member expression)
    { code: `run();` },
    // Arrow function — no bind needed
    { code: `const greet = () => { return 'hello'; };` },
    // Computed property access that resolves to something other than bind/call/apply
    { code: `obj['method']();` }
  ],
  invalid: [
    // .bind(...)
    {
      code: `const fn = myFunc.bind(this);`,
      errors: [{ messageId: 'forbidden' }]
    },
    // .call(...)
    {
      code: `myFunc.call(null, 1, 2);`,
      errors: [{ messageId: 'forbidden' }]
    },
    // .apply(...)
    {
      code: `myFunc.apply(context, args);`,
      errors: [{ messageId: 'forbidden' }]
    },
    // .bind with no arguments still forbidden
    {
      code: `const bound = fn.bind(null);`,
      errors: [{ messageId: 'forbidden' }]
    },
    // Chained .bind
    {
      code: `const a = foo.bar.bind(ctx);`,
      errors: [{ messageId: 'forbidden' }]
    },
    // Computed member expression with literal 'bind'
    {
      code: `fn['bind'](this);`,
      errors: [{ messageId: 'forbidden' }]
    },
    // Computed member expression with literal 'call'
    {
      code: `fn['call'](null);`,
      errors: [{ messageId: 'forbidden' }]
    },
    // Computed member expression with literal 'apply'
    {
      code: `fn['apply'](null, []);`,
      errors: [{ messageId: 'forbidden' }]
    }
  ]
});
