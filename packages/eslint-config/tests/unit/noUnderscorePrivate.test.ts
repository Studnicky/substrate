import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noUnderscorePrivate } from '../../src/rules/noUnderscorePrivate.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': { 'sourceType': 'module' }
  }
});

ruleTester.run('no-underscore-private', noUnderscorePrivate, {
  'valid': [
    {
      'code': 'class A { #bar = 1; #baz(): void {} }',
      'name': 'real private field/method — not reported'
    },
    {
      'code': 'class A { bar = 1; baz(): void {} }',
      'name': 'plain public members — not reported'
    },
    {
      'code': 'class A { protected bar = 1; private baz(): void {} }',
      'name': 'TS accessibility modifiers without underscore — not reported'
    },
    {
      'code': 'const o = { _bar: 1 };',
      'name': 'object literal property — not a class member, not reported'
    },
    {
      'code': 'class A { ["_bar"] = 1; }',
      'name': 'computed key — not reported (cannot statically prove the name)'
    },
    {
      'code': 'class Foo { constructor(_bar: string) {} }',
      'name': 'constructor parameter without accessibility/readonly — not a field declaration, not reported'
    },
    {
      'code': 'class Foo { constructor(private bar: string) {} }',
      'name': 'parameter property without underscore — not reported'
    }
  ],
  'invalid': [
    {
      'code': 'class A { _bar = 1; }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'underscore-prefixed field — forbidden'
    },
    {
      'code': 'class A { _bar(): void {} }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'underscore-prefixed method — forbidden'
    },
    {
      'code': 'class A { static _bar = 1; }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'underscore-prefixed static field — forbidden'
    },
    {
      'code': 'class A { get _bar(): number { return 1; } }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'underscore-prefixed getter — forbidden'
    },
    {
      'code': 'class A { private _bar = 1; }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'underscore-prefixed field even with an explicit `private` modifier — forbidden'
    },
    {
      'code': 'class Foo { constructor(private _bar: string) {} }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'underscore-prefixed constructor parameter property with `private` — forbidden'
    },
    {
      'code': 'class Foo { constructor(readonly _bar: string) {} }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'underscore-prefixed constructor parameter property with `readonly` — forbidden'
    }
  ]
});
