import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { allTypesAreEntities } from '../../src/rules/allTypesAreEntities.js';

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
    name: 'type alias inside an entities/*.ts file — exempt path'
  },
  {
    code: 'export type FooType = { a: string };',
    filename: '/project/packages/foo/src/types/Foo.ts',
    name: 'type alias inside src/types/ — exempt path'
  },
  {
    code: 'type FooType = { a: string };',
    filename: '/project/packages/foo/tests/unit/foo.test.ts',
    name: 'type alias inside tests/ — exempt path'
  },
  {
    code: 'type SourceCodeLike = { getCommentsBefore: (node: unknown) => readonly unknown[] };',
    filename: '/project/packages/eslint-config/src/rules/someRule.ts',
    name: 'type alias inside the eslint-config package itself — exempt path'
  },
  {
    code: 'export namespace RetryConfigEntity { export type Type = { a: string }; }',
    filename: '/project/packages/foo/src/models/RetryConfig.ts',
    name: 'type alias declared inside a TS namespace — not flagged regardless of path'
  },
  {
    code: [
      '// json-schema-uninexpressible: function types cannot be expressed in JSON Schema',
      'type Handler = (x: number) => void;'
    ].join('\n'),
    filename: '/project/packages/foo/src/models/Handler.ts',
    name: 'type alias with a json-schema-uninexpressible directive comment — exempt'
  },
  {
    code: [
      '// json-schema-uninexpressible: function types cannot be expressed in JSON Schema',
      'export type Handler = (x: number) => void;'
    ].join('\n'),
    filename: '/project/packages/foo/src/models/Handler.ts',
    name: 'exported type alias with directive comment above the export wrapper — exempt'
  }
];

const invalidScenarios: InvalidScenarioType[] = [
  {
    code: 'type FooType = { a: string };',
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'free-standing type alias outside all exempt paths — forbidden'
  },
  {
    code: 'export type FooType = string | number;',
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'exported free-standing union type alias outside exempt paths — forbidden'
  },
  {
    code: [
      '// not a directive comment',
      'type FooType = { a: string };'
    ].join('\n'),
    errors: [{ messageId: 'forbidden-type-alias' }],
    filename: '/project/packages/foo/src/models/Foo.ts',
    name: 'non-directive comment above the alias does not exempt it'
  }
];

ruleTester.run('all-types-are-entities', allTypesAreEntities, {
  invalid: invalidScenarios,
  valid: validScenarios
});
