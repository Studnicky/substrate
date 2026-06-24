import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noTypeAliasing } from '../../src/rules/noTypeAliasing.js';

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
  readonly name: string;
};

type InvalidScenarioType = {
  readonly code: string;
  readonly errors: readonly { readonly messageId: string }[];
  readonly name: string;
};

const validScenarios: ValidScenarioType[] = [
  {
    code: 'type Wrapped<T> = { value: T }',
    name: 'generic alias that creates a new shape — not a forwarding shim'
  },
  {
    code: 'type Mapped<T, U> = Map<U, T>',
    name: 'generic alias with reordered type args — not a forwarding shim'
  },
  {
    code: 'type FooType = Map<string, BarType>',
    name: 'parameterized rhs — instantiating a generic'
  },
  {
    code: 'type FooType = string | number',
    name: 'union type'
  },
  {
    code: 'type FooType = AType & BType',
    name: 'intersection type'
  },
  {
    code: 'type FooType = { a: string }',
    name: 'object shape type'
  },
  {
    code: 'type FooType = () => void',
    name: 'function type'
  },
  {
    code: 'type FooType = FooItem[]',
    name: 'array type'
  },
  {
    code: 'type FooType = AType extends BType ? CType : DType',
    name: 'conditional type'
  },
  {
    code: "import { FooType } from './foo'",
    name: 'import without alias'
  }
];

const invalidScenarios: InvalidScenarioType[] = [
  {
    code: 'type FooList<T> = Array<T>',
    errors: [{ messageId: 'genericForwardingAlias' }],
    name: 'generic forwarding shim — single type param forwarded unchanged'
  },
  {
    code: 'type FooType<T> = BarType<T>',
    errors: [{ messageId: 'genericForwardingAlias' }],
    name: 'generic forwarding shim — named generic forwarded unchanged'
  },
  {
    code: 'type Pair<T, U> = Map<T, U>',
    errors: [{ messageId: 'genericForwardingAlias' }],
    name: 'generic forwarding shim — two type params forwarded in same order'
  },
  {
    code: 'type FooType = BarType',
    errors: [{ messageId: 'nakedTypeAlias' }],
    name: 'naked type reference re-alias'
  },
  {
    code: 'type IdType = string',
    errors: [{ messageId: 'primitiveTypeAlias' }],
    name: 'string primitive alias'
  },
  {
    code: 'type CountType = number',
    errors: [{ messageId: 'primitiveTypeAlias' }],
    name: 'number primitive alias'
  },
  {
    code: 'type FlagType = boolean',
    errors: [{ messageId: 'primitiveTypeAlias' }],
    name: 'boolean primitive alias'
  },
  {
    code: "import { FooType as BarType } from './foo'",
    errors: [{ messageId: 'importAlias' }],
    name: 'import alias that hides canonical name'
  }
];

ruleTester.run('no-type-aliasing', noTypeAliasing, {
  invalid: invalidScenarios,
  valid: validScenarios
});
