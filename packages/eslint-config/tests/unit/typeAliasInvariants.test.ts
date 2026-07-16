import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { typeAliasInvariants } from '../../src/rules/typeAliasInvariants.js';

// Workspace root — projectService resolves tsconfig and module symbols from here.
// Type-aware parsing is required by check 2 (noReadonly) and check 5 (noPreferExisting);
// checks 1/3/4 are purely syntactic and are unaffected by running under projectService.
const repoRoot = resolve(import.meta.dirname, '../../../..');

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts', 'src/entities/*.ts']
      },
      'tsconfigRootDir': repoRoot
    }
  }
});

ruleTester.run('type-alias-invariants', typeAliasInvariants, {
  'valid': [
    // --- check 1: mustEndType (from typeAliasMustEndType.test.ts) ---
    {
      'code': 'export type FooType = { a: number };',
      'name': '[mustEndType] inline export already ends in Type — not flagged',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'code': 'type Foo = { a: number };',
      'name': '[mustEndType] not exported at all — not flagged',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'code': 'export type Foo = { a: number };',
      'name': '[mustEndType] disabled via option — does not fire',
      'options': [{ 'derivedFromSchema': false, 'mustEndType': false }]
    },

    // --- check 2: noReadonly (from noReadonlyInDataType.test.ts) ---
    {
      'name': '[noReadonly] mutable exported type alias — no readonly anywhere',
      'code': 'export type MutableType = { a: number; items: string[]; nested: { x: number } };',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'name': '[noReadonly] mutable exported tuple — no readonly',
      'code': 'export type MutTupleType = [number, string];'
    },
    {
      'name': '[noReadonly] generic mapped transform — DeepReadonlyType<T> resolves to no concrete readonly members with unbound T',
      'code': 'export type DeepReadonlyType<T> = { readonly [K in keyof T]: T[K] };',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'name': '[noReadonly] generic conditional type — DeepMergeType<A,B> resolves clean with unbound type params',
      'code': 'export type DeepMergeType<A, B> = A extends readonly unknown[] ? B : A;'
    },
    {
      'name': '[noReadonly] reference to a readonly type — item property resolves via named aliasSymbol, isInlineStructural stops recursion',
      'code': [
        'type FlatType = { readonly a: number };',
        'export type RefType = { item: FlatType };'
      ].join('\n'),
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'name': '[noReadonly] non-exported type alias with readonly — parent.type !== ExportNamedDeclaration, out of scope',
      'code': 'type PrivateType = { readonly a: number };',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'name': '[noReadonly] readonly type alias declared separately with no export statement at all — not locally exported',
      'code': 'type FooType = { readonly x: string };',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'name': '[noReadonly] disabled via option — flat readonly property signature no longer flagged',
      'code': 'export type FlatType = { readonly a: number };',
      'options': [{ 'derivedFromSchema': false, 'noReadonly': false }]
    },

    // --- check 3: noAliasing (from noTypeAliasing.test.ts) ---
    {
      'code': 'type Wrapped<T> = { value: T }',
      'name': '[noAliasing] generic alias that creates a new shape — not a forwarding shim',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'code': 'type Mapped<T, U> = Map<U, T>',
      'name': '[noAliasing] generic alias with reordered type args — not a forwarding shim'
    },
    {
      'code': 'type FooType = Map<string, BarType>',
      'name': '[noAliasing] parameterized rhs — instantiating a generic'
    },
    {
      'code': 'type FooType = string | number',
      'name': '[noAliasing] union type'
    },
    {
      'code': 'type FooType = AType & BType',
      'name': '[noAliasing] intersection type'
    },
    {
      'code': 'type FooType = () => void',
      'name': '[noAliasing] function type'
    },
    {
      'code': 'type FooType = FooItem[]',
      'name': '[noAliasing] array type'
    },
    {
      'code': 'type FooType = AType extends BType ? CType : DType',
      'name': '[noAliasing] conditional type'
    },
    {
      'code': "import { FooType } from './foo'",
      'name': '[noAliasing] import without alias'
    },
    {
      'code': 'type FooType = BarType',
      'name': '[noAliasing] disabled via option — naked type reference no longer flagged',
      'options': [{ 'noAliasing': false }]
    },

    // --- check 4: derivedFromSchema (from typesDerivedFromSchema.test.ts) ---
    {
      'code': 'export type Type = { a: string };',
      'filename': 'src/entities/RetryConfigEntity.ts',
      'name': '[derivedFromSchema] inline object shape inside an entities/ file — exempt path'
    },
    {
      'code': 'export type FooType = FromSchema<typeof FooSchema>;',
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] FromSchema<typeof XSchema> reference — the canonical derivation form'
    },
    {
      'code': 'export type FooType = AType | BType;',
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] union of named types only — no inline literal member'
    },
    {
      'code': 'export type FooType = AType & BType;',
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] intersection of named types only — no inline literal member'
    },
    {
      'code': 'export type FooType = { a: string } & { readonly b: unique symbol };',
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] branded intersection — standard TS branding pattern is exempt',
      'options': [{ 'noReadonly': false }]
    },
    {
      'code': 'export type HandlerType = (x: number) => void;',
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] function type alias — not a TSTypeLiteral, out of scope for this rule'
    },
    {
      'code': 'export type FooType = string;',
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] primitive type alias — not a TSTypeLiteral, out of scope for this rule',
      'options': [{ 'noAliasing': false }]
    },
    {
      'code': [
        '// json-schema-uninexpressible: this shape needs a mapped-type transform',
        'export type FooType = { a: string };'
      ].join('\n'),
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] inline object shape with a json-schema-uninexpressible directive comment — exempt'
    },
    {
      'code': 'type FooType = { a: number };',
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] disabled via option — inline object-literal type alias no longer flagged',
      'options': [{ 'derivedFromSchema': false }]
    },

    // --- check 5: noPreferExisting (from noPreferExistingType.test.ts) ---
    {
      'code': 'type FooType = { a: string; b: number };',
      'name': '[noPreferExisting] no imports from any package — rule does not fire',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'code': [
        "import { plugin } from '@studnicky/eslint-config';",
        'type FooType = { a: string; b: number };'
      ].join('\n'),
      'name': '[noPreferExisting] imports present but local type has unrelated fields — no match',
      'options': [{ 'derivedFromSchema': false, 'noPreferExisting': { 'minFields': 2 } }]
    },
    {
      'code': [
        "import { plugin } from '@studnicky/eslint-config';",
        'type LocalPluginType = { rules: Record<string, unknown> };'
      ].join('\n'),
      'name': '[noPreferExisting] below minFields threshold — rule does not fire',
      'options': [{ 'derivedFromSchema': false, 'noPreferExisting': { 'minFields': 2 } }]
    },
    {
      'code': [
        "import { Buffer } from 'node:buffer';",
        'type LocalType = { data: unknown };'
      ].join('\n'),
      'name': '[noPreferExisting] node: prefix is excluded by default — rule does not fire',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'code': [
        "import type { Rule } from 'eslint';",
        "import { plugin } from '@studnicky/eslint-config';",
        'type LocalPluginType = { rules: Record<string, Rule.RuleModule> };'
      ].join('\n'),
      'name': '[noPreferExisting] exactMatch severity set to off — rule does not fire',
      'options': [{ 'derivedFromSchema': false, 'noPreferExisting': { 'exactMatch': 'off', 'excludePrefixes': ['@types/', 'eslint', 'node:'], 'minFields': 1 } }]
    },
    {
      'code': [
        "import { plugin } from '@studnicky/eslint-config';",
        'type LocalPluginType = { rules: Record<string, unknown>; extraRequired: number };'
      ].join('\n'),
      'name': '[noPreferExisting] local type has more required fields than imported — imported does not cover local (off)',
      'options': [{ 'derivedFromSchema': false, 'noPreferExisting': { 'minFields': 1 } }]
    },
    {
      'code': [
        "import { plugin } from '@studnicky/eslint-config';",
        'interface FooType { a: string; b: number }'
      ].join('\n'),
      'name': '[noPreferExisting] interface with unrelated fields — no match',
      'options': [{ 'noPreferExisting': { 'minFields': 2 } }]
    },
    {
      'code': [
        "import type { Rule } from 'eslint';",
        "import { plugin } from '@studnicky/eslint-config';",
        'type LocalPluginType = { rules: Record<string, Rule.RuleModule> };'
      ].join('\n'),
      'name': '[noPreferExisting] disabled entirely via boolean false — exactMatch shape no longer flagged',
      'options': [{ 'derivedFromSchema': false, 'noPreferExisting': false }]
    }
  ],
  'invalid': [
    // --- check 1: mustEndType ---
    {
      'code': 'export type Foo = { a: number };',
      'errors': [{ 'messageId': 'mustEndType' }],
      'name': '[mustEndType] inline export not ending in Type — flagged',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'code': 'type Foo = { a: number }; export type { Foo };',
      'errors': [{ 'messageId': 'mustEndType' }],
      'name': '[mustEndType] separate re-export form — flagged even though the declaration itself is not exported inline',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'code': 'type Foo = { a: number }; export { type Foo };',
      'errors': [{ 'messageId': 'mustEndType' }],
      'name': '[mustEndType] separate re-export with specifier-level type keyword — flagged',
      'options': [{ 'derivedFromSchema': false }]
    },
    {
      'code': [
        'type Foo = { a: number };',
        'type Bar = { b: number };',
        'type Baz = { c: number };',
        'export { type Foo, type Bar, type Baz };'
      ].join('\n'),
      'errors': [{ 'messageId': 'mustEndType' }, { 'messageId': 'mustEndType' }, { 'messageId': 'mustEndType' }],
      'name': '[mustEndType] three separate re-exported aliases in one file — all three flagged (regression guard for the memoized re-export name collection)',
      'options': [{ 'derivedFromSchema': false }]
    },

    // --- check 2: noReadonly ---
    {
      'name': '[noReadonly] flat readonly property signature — bakes readonly into own inline shape',
      'code': 'export type FlatType = { readonly a: number };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'options': [{ 'derivedFromSchema': false }],
      'output': 'export type FlatType = { a: number };'
    },
    {
      'name': '[noReadonly] nested inline readonly property — recursion into anonymous object type',
      'code': 'export type NestedType = { outer: { readonly deep: string } };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'options': [{ 'derivedFromSchema': false }],
      'output': 'export type NestedType = { outer: { deep: string } };'
    },
    {
      'name': '[noReadonly] readonly array in property type — ArrPropType bakes readonly via TSTypeOperator',
      'code': 'export type ArrPropType = { items: readonly string[] };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'options': [{ 'derivedFromSchema': false }],
      'output': 'export type ArrPropType = { items: string[] };'
    },
    {
      'name': '[noReadonly] readonly index signature — DictType bakes readonly via TSIndexSignature',
      'code': 'export type DictType = { readonly [k: string]: number };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'options': [{ 'derivedFromSchema': false }],
      'output': 'export type DictType = { [k: string]: number };'
    },
    {
      'name': '[noReadonly] readonly array alias — ROArrayType is a top-level readonly array via TSTypeOperator',
      'code': 'export type ROArrayType = readonly string[];',
      'errors': [{ 'messageId': 'noReadonly' }],
      'output': 'export type ROArrayType = string[];'
    },
    {
      'name': '[noReadonly] readonly tuple alias — TupleType bakes readonly via tuple target.readonly',
      'code': 'export type TupleType = readonly [number, string];',
      'errors': [{ 'messageId': 'noReadonly' }],
      'output': 'export type TupleType = [number, string];'
    },
    {
      'name': '[noReadonly] self-recursive type with readonly children array — visited Set prevents infinite loop',
      'code': 'export type RecursiveType = { name: string; children: readonly RecursiveType[] };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'options': [{ 'derivedFromSchema': false }],
      'output': 'export type RecursiveType = { name: string; children: RecursiveType[] };'
    },
    {
      'name': '[noReadonly] multiple readonly property signatures — each reported independently, both removed by fixer',
      'code': 'export type MultiType = { readonly a: number; readonly b: string };',
      'errors': [{ 'messageId': 'noReadonly' }, { 'messageId': 'noReadonly' }],
      'options': [{ 'derivedFromSchema': false }],
      'output': 'export type MultiType = { a: number; b: string };'
    },
    {
      'name': '[noReadonly] readonly type alias re-exported via separate export type {} specifier list — parent is Program, not ExportNamedDeclaration',
      'code': 'type FooType = { readonly x: string };\nexport type { FooType };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'options': [{ 'derivedFromSchema': false }],
      'output': 'type FooType = { x: string };\nexport type { FooType };'
    },

    // --- check 3: noAliasing ---
    {
      'code': 'type FooList<T> = Array<T>',
      'errors': [{ 'messageId': 'genericForwardingAlias' }],
      'name': '[noAliasing] generic forwarding shim — single type param forwarded unchanged'
    },
    {
      'code': 'type FooType<T> = BarType<T>',
      'errors': [{ 'messageId': 'genericForwardingAlias' }],
      'name': '[noAliasing] generic forwarding shim — named generic forwarded unchanged'
    },
    {
      'code': 'type Pair<T, U> = Map<T, U>',
      'errors': [{ 'messageId': 'genericForwardingAlias' }],
      'name': '[noAliasing] generic forwarding shim — two type params forwarded in same order'
    },
    {
      'code': 'type FooType = BarType',
      'errors': [{ 'messageId': 'nakedTypeAlias' }],
      'name': '[noAliasing] naked type reference re-alias'
    },
    {
      'code': 'type IdType = string',
      'errors': [{ 'messageId': 'primitiveTypeAlias' }],
      'name': '[noAliasing] string primitive alias'
    },
    {
      'code': 'type CountType = number',
      'errors': [{ 'messageId': 'primitiveTypeAlias' }],
      'name': '[noAliasing] number primitive alias'
    },
    {
      'code': 'type FlagType = boolean',
      'errors': [{ 'messageId': 'primitiveTypeAlias' }],
      'name': '[noAliasing] boolean primitive alias'
    },
    {
      'code': "import { FooType as BarType } from './foo'",
      'errors': [{ 'messageId': 'importAlias' }],
      'name': '[noAliasing] import alias that hides canonical name'
    },

    // --- check 4: derivedFromSchema ---
    {
      'code': 'type FooType = { a: number };',
      'errors': [{ 'messageId': 'derivedFromSchema' }],
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] inline object-literal type alias outside entities/ — forbidden'
    },
    {
      'code': 'export type FooType = { a: number; b: string };',
      'errors': [{ 'messageId': 'derivedFromSchema' }],
      'filename': 'Foo.ts',
      'name': '[derivedFromSchema] exported inline object-literal type alias — forbidden'
    },

    // --- check 5: noPreferExisting ---
    {
      'code': [
        "import type { Rule } from 'eslint';",
        "import { plugin } from '@studnicky/eslint-config';",
        'type LocalPluginType = { rules: Record<string, Rule.RuleModule> };'
      ].join('\n'),
      'errors': [{ 'messageId': 'exactMatch' }],
      'name': '[noPreferExisting] exactMatch: local type is structurally identical to imported type',
      'options': [{ 'derivedFromSchema': false, 'noPreferExisting': { 'exactMatch': 'error', 'excludePrefixes': ['@types/', 'eslint', 'node:'], 'minFields': 1 } }]
    },
    {
      'code': [
        "import type { Rule } from 'eslint';",
        "import { plugin } from '@studnicky/eslint-config';",
        'type LocalPluginType = { rules: Record<string, Rule.RuleModule>; optionalExtra?: string };'
      ].join('\n'),
      'errors': [{ 'messageId': 'nearMatch' }],
      'name': '[noPreferExisting] nearMatch: local has same required fields as imported but different optional count',
      'options': [{ 'derivedFromSchema': false, 'noPreferExisting': { 'excludePrefixes': ['@types/', 'eslint', 'node:'], 'minFields': 1, 'nearMatch': 'error' } }]
    },
    {
      'code': [
        "import { plugin } from '@studnicky/eslint-config';",
        'type LocalPluginType = { rules: Record<string, unknown> };'
      ].join('\n'),
      'errors': [{ 'messageId': 'subsumedMatch' }],
      'name': '[noPreferExisting] subsumedMatch: local type covered by imported but not the reverse due to narrower value types',
      'options': [{ 'derivedFromSchema': false, 'noPreferExisting': { 'minFields': 1, 'subsumedMatch': 'error' } }]
    },
    {
      'code': [
        "import type { Rule } from 'eslint';",
        "import { plugin } from '@studnicky/eslint-config';",
        'interface LocalPluginType { rules: Record<string, Rule.RuleModule> }'
      ].join('\n'),
      'errors': [{ 'messageId': 'exactMatch' }],
      'name': '[noPreferExisting] exactMatch: local interface is structurally identical to imported type',
      'options': [{ 'noPreferExisting': { 'exactMatch': 'error', 'excludePrefixes': ['@types/', 'eslint', 'node:'], 'minFields': 1 } }]
    },

    // --- cross-check: a single alias triggers two independent checks simultaneously ---
    {
      'code': 'export type Foo = { a: number };',
      'errors': [{ 'messageId': 'mustEndType' }, { 'messageId': 'derivedFromSchema' }],
      'filename': 'Foo.ts',
      'name': '[mustEndType + derivedFromSchema] exported inline object-literal alias outside entities/ that also does not end in Type — both violations reported'
    },

    // --- cross-check: "delete this declaration" verdicts suppress mustEndType's "rename it" ---
    // advice on the same node, since renaming a declaration slated for deletion is contradictory.
    {
      'code': [
        'interface FooInterface { a: number }',
        'export type Foo = FooInterface;'
      ].join('\n'),
      'errors': [{ 'messageId': 'nakedTypeAlias' }],
      'name': '[noAliasing suppresses mustEndType] naked alias not ending in Type — only nakedTypeAlias reported, not a contradictory rename'
    },
    {
      'code': 'export type Foo = string;',
      'errors': [{ 'messageId': 'primitiveTypeAlias' }],
      'name': '[noAliasing suppresses mustEndType] primitive alias not ending in Type — only primitiveTypeAlias reported, not a contradictory rename'
    },

    // --- cross-check: noPreferExisting's "delete this, use the import" verdict suppresses
    // derivedFromSchema's "move this into an entity" advice on the same node, since entity-ifying
    // a redundant duplicate just re-declares the same redundancy in a new location.
    {
      'code': [
        "import type { Rule } from 'eslint';",
        "import { plugin } from '@studnicky/eslint-config';",
        'type LocalPluginType = { rules: Record<string, Rule.RuleModule> };'
      ].join('\n'),
      'errors': [{ 'messageId': 'exactMatch' }],
      'name': '[noPreferExisting suppresses derivedFromSchema] exact duplicate of an imported type — only exactMatch reported, not a contradictory entity move',
      'options': [{ 'noPreferExisting': { 'exactMatch': 'error', 'excludePrefixes': ['@types/', 'eslint', 'node:'], 'minFields': 1 } }]
    }
  ]
});
