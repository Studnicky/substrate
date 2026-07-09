import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { typesDerivedFromSchema } from '../../src/rules/typesDerivedFromSchema.js';

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

type ValidScenarioType = {
  readonly code: string;
  readonly filename?: string;
  readonly name: string;
};

type InvalidScenarioType = {
  readonly code: string;
  readonly errors: readonly { readonly messageId: string }[];
  readonly filename?: string;
  readonly name: string;
};

const validScenarios: ValidScenarioType[] = [
  {
    code: 'export type Type = { a: string };',
    filename: '/project/packages/retry/src/entities/RetryConfigEntity.ts',
    name: 'inline object shape inside an entities/ file — exempt path'
  },
  {
    code: 'export type FooType = FromSchema<typeof FooSchema>;',
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'FromSchema<typeof XSchema> reference — the canonical derivation form'
  },
  {
    code: 'export type FooType = AType | BType;',
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'union of named types only — no inline literal member'
  },
  {
    code: 'export type FooType = AType & BType;',
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'intersection of named types only — no inline literal member'
  },
  {
    code: 'export type FooType = { a: string } & { readonly b: unique symbol };',
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'branded intersection — standard TS branding pattern is exempt'
  },
  {
    code: 'export type Handler = (x: number) => void;',
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'function type alias — not a TSTypeLiteral, out of scope for this rule'
  },
  {
    code: 'export type FooType = string;',
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'primitive type alias — not a TSTypeLiteral, out of scope for this rule'
  },
  {
    code: [
      '// json-schema-uninexpressible: this shape needs a mapped-type transform',
      'export type FooType = { a: string };'
    ].join('\n'),
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'inline object shape with a json-schema-uninexpressible directive comment — exempt'
  }
];

const invalidScenarios: InvalidScenarioType[] = [
  {
    code: 'type FooType = { a: number };',
    errors: [{ messageId: 'inline-shape' }],
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'inline object-literal type alias outside entities/ — forbidden'
  },
  {
    code: 'export type FooType = { a: number; b: string };',
    errors: [{ messageId: 'inline-shape' }],
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'exported inline object-literal type alias — forbidden'
  }
];

ruleTester.run('types-derived-from-schema', typesDerivedFromSchema, {
  invalid: invalidScenarios,
  valid: validScenarios
});
