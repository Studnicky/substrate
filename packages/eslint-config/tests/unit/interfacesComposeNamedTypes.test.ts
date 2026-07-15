import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfacesComposeNamedTypes } from '../../src/rules/interfacesComposeNamedTypes.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    }
  }
});

ruleTester.run('interfaces-compose-named-types', interfacesComposeNamedTypes, {
  'valid': [
    {
      'code': 'interface Foo { bar: BarType; }',
      'name': 'interface referencing a named type — not flagged'
    },
    {
      'code': 'interface Foo<T extends { a: number }> { bar: T; }',
      'name': 'generic type-parameter constraint containing an object literal — exempt via TSTypeParameter ancestor'
    },
    {
      'code': 'type Foo = { a: number };',
      'name': 'inline object literal on a type alias (not an interface) — not flagged'
    },
    {
      'code': 'interface Foo { greet(): void; }',
      'name': 'method signature with no inline object literal — not flagged'
    }
  ],
  'invalid': [
    {
      'code': 'interface Foo { bar: { a: number }; }',
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'interface with inline object property type — flagged'
    },
    {
      'code': 'interface Foo { method(): { a: number }; }',
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'method signature returning an inline object type — flagged'
    },
    {
      'code': 'interface Foo { [key: string]: { a: number }; }',
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'index signature with inline object value type — flagged'
    },
    {
      'code': "type Keys = 'a' | 'b'; interface Foo { bar: { [K in Keys]: string }; }",
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'interface with inline mapped type property — flagged'
    }
  ]
});
