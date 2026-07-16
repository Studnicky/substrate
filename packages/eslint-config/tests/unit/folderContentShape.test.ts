import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { folderContentShape } from '../../src/rules/folderContentShape.js';

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

const ENTITY_FILE = '/project/src/FooEntity.ts';

ruleTester.run('folder-content-shape', folderContentShape, {
  'invalid': [
    {
      'code': 'export const FooEntity = {};',
      'errors': [{ 'messageId': 'noNamespace' }],
      'filename': ENTITY_FILE,
      'name': '[entities] missing namespace entirely'
    },
    {
      'code': `
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object' };
          export type Type = FromSchema<typeof Schema>;
          export function validate(candidate: unknown): candidate is Type {
            return true;
          }
        }
      `,
      'errors': [{ 'messageId': 'schemaNotConst' }],
      'filename': ENTITY_FILE,
      'name': '[entities] Schema present but not as const -> schemaNotConst'
    },
    {
      'code': `
        export namespace FooEntity {
          export const Schema = { type: 'object' } as const;
          export type Type = { id: string };
          export function validate(candidate: unknown): candidate is Type {
            return true;
          }
        }
      `,
      'errors': [{ 'messageId': 'typeNotFromSchema' }],
      'filename': ENTITY_FILE,
      'name': '[entities] type Type hand-written (not FromSchema) -> typeNotFromSchema'
    },
    {
      'code': `
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object' } as const;
          export type Type = FromSchema<typeof Schema>;
          export function validate(_candidate: unknown): boolean {
            return true;
          }
        }
      `,
      'errors': [{ 'messageId': 'validateNotTypeGuard' }],
      'filename': ENTITY_FILE,
      'name': '[entities] validate returns boolean instead of type guard -> validateNotTypeGuard'
    },
    {
      'code': 'export namespace FooEntity {}',
      'errors': [
        { 'messageId': 'missingSchema' },
        { 'messageId': 'missingType' },
        { 'messageId': 'missingValidate' }
      ],
      'filename': ENTITY_FILE,
      'name': '[entities] missing Schema, Type, and validate -> three errors'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'errors': [{ 'messageId': 'noNamespace' }],
      'filename': '/project/src/entities/Foo.ts',
      'name': '[entities] entities/ file with 2+ top-level consts is dispatched to namespace check only, not constants-count (no double-report)'
    },
    {
      'code': 'export type FooType = { readonly id: string };',
      'errors': [{ 'messageId': 'typeInInterfacesFolder' }],
      'filename': '/project/src/interfaces/FooType.ts',
      'name': '[interfaces/types] type alias (pure data) declared under interfaces/ folder -> flagged'
    },
    {
      'code': 'export interface FooInterface { readonly id: string; }',
      'errors': [{ 'messageId': 'interfaceInTypesFolder' }],
      'filename': '/project/src/types/FooInterface.ts',
      'name': '[interfaces/types] interface declared under types/ folder -> flagged'
    },
    {
      'code': 'export type LogBodyDataType = { context: Record<string, unknown>; event: string; };',
      'errors': [{ 'messageId': 'typeInInterfacesFolder' }],
      'filename': '/repo/packages/logger/src/interfaces/LogBodyDataType.ts',
      'name': '[interfaces/types] real-world case: LogBodyDataType pure data type alias in interfaces/ -> flagged'
    },
    {
      'code': 'export const TIMEOUT_MS = 1000; export const MAX_RETRIES = 3;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/http/client.ts',
      'name': '[constants] two top-level non-exempt consts -> flagged once, listing both names'
    },
    {
      'code': 'const items = [1, 2, 3]; const expected = 6;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/examples/walkthrough.ts',
      'name': '[constants] example file with 2+ top-level consts not under fixtures/ -> still flagged'
    },
    {
      'code': 'const A = 1; const B = 2; const C = 3;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/values.ts',
      'name': '[constants] three top-level non-exempt consts -> flagged once'
    },
    {
      'code': 'export const CONFIG = {}; const OTHER = 2;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/mixed.ts',
      'name': '[constants] mix of exported and non-exported top-level consts -> flagged'
    },
    {
      'code': 'export const MAX_RETRIES = 3; export const TIMEOUT_MS = 1000; export const onClick = (): void => {};',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/http/mixedWithFunction.ts',
      'name': '[constants] two data consts plus a function const -> still flagged for the two data consts'
    },
    {
      'code': 'export const { ALPHA, BETA, GAMMA } = CONFIG;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/http/destructuredObject.ts',
      'name': '[constants] destructured object pattern introducing three names -> flagged'
    },
    {
      'code': 'export const [a, b, c] = arr;',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/http/destructuredArray.ts',
      'name': '[constants] destructured array pattern introducing three names -> flagged'
    },
    {
      'code': 'export const CACHE = new Set([1, 2, 3]); export const SEEN = new Map([["a", 1]]);',
      'errors': [{ 'messageId': 'mustLiveInConstantsFolder' }],
      'filename': '/project/src/http/collectionLiterals.ts',
      'name': '[constants] two genuine new Set()/new Map() literal-collection consts -> still flagged (Set/Map carve-out regression guard)'
    },
    {
      'code': 'export function isEmail(value: string): boolean { return /^[^@]+@[^@]+$/u.test(value); }',
      'errors': [{ 'messageId': 'regexBelongsInConstants' }],
      'filename': '/project/src/validation/isEmail.ts',
      'name': '[regex] single inline regex literal nested inside a function body -> flagged (zero-tolerance, unlike the 2+ threshold for other constants)'
    },
    {
      'code': 'export const VALID_ID = /^[a-z0-9-]+$/u;',
      'errors': [{ 'messageId': 'regexBelongsInConstants' }],
      'filename': '/project/src/validation/patterns.ts',
      'name': '[regex] top-level regex literal assigned to a const -> flagged'
    },
    {
      'code': 'export function normalize(value: string): string { return value.replace(new RegExp("[\\\\s]+", "g"), " "); }',
      'errors': [{ 'messageId': 'regexBelongsInConstants' }],
      'filename': '/project/src/validation/normalize.ts',
      'name': '[regex] inline "new RegExp(...)" construction with a literal string pattern -> flagged'
    },
    {
      'code': [
        'export function scan(value: string): boolean {',
        '  return /a/u.test(value) && /b/u.test(value);',
        '}'
      ].join('\n'),
      'errors': [{ 'messageId': 'regexBelongsInConstants' }, { 'messageId': 'regexBelongsInConstants' }],
      'filename': '/project/src/validation/scan.ts',
      'name': '[regex] two separate inline regex literals in one file -> both flagged independently'
    },
    {
      'code': 'export function isEmail(value: string): boolean { return /^[^@]+@[^@]+$/u.test(value); }',
      'errors': [{ 'messageId': 'regexBelongsInConstants' }],
      'filename': '/project/src/types/isEmail.ts',
      'name': '[regex] inline regex inside a types/ folder file -> still flagged alongside the declaration-form check'
    }
  ],
  'valid': [
    {
      'code': `
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } as const;
          export type Type = FromSchema<typeof Schema>;
          export function validate(candidate: unknown): candidate is Type {
            return typeof (candidate as Record<string, unknown>).id === 'string';
          }
        }
      `,
      'filename': ENTITY_FILE,
      'name': '[entities] valid entity: Schema as const, Type from FromSchema, function type guard'
    },
    {
      'code': `
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object' } as const;
          export type Type = FromSchema<typeof Schema>;
          export const validate = (candidate: unknown): candidate is Type => {
            return candidate !== null;
          };
        }
      `,
      'filename': ENTITY_FILE,
      'name': '[entities] valid entity: validate as const arrow function with type guard'
    },
    {
      'code': `
        import { SchemaValidator } from '@studnicky/json';
        import type { FromSchema } from 'json-schema-to-ts';
        export namespace FooEntity {
          export const Schema = { type: 'object' } as const;
          export type Type = FromSchema<typeof Schema>;
          export const validate = SchemaValidator.compile<Type>(Schema);
        }
      `,
      'filename': ENTITY_FILE,
      'name': '[entities] valid entity: validate compiled from schema via SchemaValidator.compile<Type>(Schema)'
    },
    {
      'code': `
        export * from './FooEntity.js';
        export * from './BarEntity.js';
      `,
      'filename': '/project/src/entities/index.ts',
      'name': '[entities] index.ts barrel under entities/ is exempt from namespace checks (index-file exclusion)'
    },
    {
      'code': 'export interface FooInterface { readonly id: string; run(): void; }',
      'filename': '/project/src/interfaces/FooInterface.ts',
      'name': '[interfaces/types] interface declared under interfaces/ folder -> not flagged'
    },
    {
      'code': 'export type FooType = { readonly id: string };',
      'filename': '/project/src/types/FooType.ts',
      'name': '[interfaces/types] type alias declared under types/ folder -> not flagged'
    },
    {
      'code': 'export type FooType = { readonly id: string };',
      'filename': '/project/src/models/FooType.ts',
      'name': '[interfaces/types] type alias not under interfaces/ or types/ (unrelated folder) -> not flagged'
    },
    {
      'code': 'export type FooType = { readonly id: string };',
      'filename': '/project/src/Foo.ts',
      'name': '[interfaces/types] type alias directly under src/, no interfaces/ or types/ segment -> not flagged'
    },
    {
      'code': 'export type FooType = { readonly id: string };',
      'filename': '/project/packages/logger/tests/unit/interfaces/FooType.test.ts',
      'name': '[interfaces/types] file under tests/ path -> exempt even though it contains a misplaced declaration'
    },
    {
      'code': 'function wrapper(): void { type Local = { a: number }; }',
      'filename': '/project/src/interfaces/Wrapper.ts',
      'name': '[interfaces/types] nested type alias inside a function body under interfaces/ -> not flagged (not top-level)'
    },
    {
      'code': 'namespace Ns { export interface Nested { run(): void; } }',
      'filename': '/project/src/types/Namespaced.ts',
      'name': '[interfaces/types] nested interface inside a namespace under types/ -> not flagged (not top-level)'
    },
    {
      'code': 'export const MAX_RETRIES = 3;',
      'filename': '/project/src/http/client.ts',
      'name': '[constants] single top-level const -> not flagged'
    },
    {
      'code': 'const Schema = {}; export const validate = (): boolean => true;',
      'filename': '/project/src/schemas/thing.ts',
      'name': '[constants] two consts but one is exempt (Schema) -> only one real const remains, not flagged'
    },
    {
      'code': 'export const ajv = {}; const compiledValidator = (): boolean => true;',
      'filename': '/project/src/schemas/other.ts',
      'name': '[constants] all consts are exempt names -> not flagged'
    },
    {
      'code': 'export const ALPHA = 1; export const BETA = 2; export const GAMMA = 3;',
      'filename': '/project/src/constants/values.ts',
      'name': '[constants] file under constants/ path -> exempt regardless of const count'
    },
    {
      'code': 'export const items = [1, 2, 3]; export const expected = 6;',
      'filename': '/project/examples/fixtures/sampleData.ts',
      'name': '[constants] file under fixtures/ path -> exempt regardless of const count (equally valid destination for test/example data)'
    },
    {
      'code': 'export const EMAIL_PATTERN = /^[^@]+@[^@]+$/u;',
      'filename': '/project/src/constants/patterns.ts',
      'name': '[regex] regex literal already declared under constants/ -> not flagged'
    },
    {
      'code': 'export const ID_PATTERN = /^[a-z0-9-]+$/u;',
      'filename': '/project/examples/fixtures/patterns.ts',
      'name': '[regex] regex literal already declared under fixtures/ -> not flagged'
    },
    {
      'code': 'export function isEmail(value: string): boolean { return /^[^@]+@[^@]+$/u.test(value); }',
      'filename': '/project/tests/unit/isEmail.test.ts',
      'name': '[regex] inline regex literal in a tests/ file -> exempt'
    },
    {
      'code': 'import { EMAIL_PATTERN } from "../constants/patterns.js"; export function isEmail(value: string): boolean { return EMAIL_PATTERN.test(value); }',
      'filename': '/project/src/validation/isEmail.ts',
      'name': '[regex] regex imported from constants/ and only referenced by name -> not flagged (no inline literal present)'
    },
    {
      'code': 'export function matches(value: string, pattern: string): boolean { return new RegExp(pattern).test(value); }',
      'filename': '/project/src/validation/matches.ts',
      'name': '[regex] "new RegExp(pattern)" built from a runtime variable, not an inlined string literal -> not flagged'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'filename': '/project/tests/unit/foo.test.ts',
      'name': '[constants] file under tests/ path -> exempt'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'filename': '/project/packages/eslint-config/src/rules/someRule.ts',
      'name': '[constants] file under eslint-config/ package path -> exempt'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'filename': '/project/eslint.config.mjs',
      'name': '[constants] eslint.config.mjs -> exempt'
    },
    {
      'code': 'export const A = 1; export const B = 2;',
      'filename': '/project/src/index.ts',
      'name': '[constants] index.ts -> exempt'
    },
    {
      'code': 'let a = 1; a = 2; function f(): void {}',
      'filename': '/project/src/other.ts',
      'name': '[constants] no top-level const declarations -> not flagged'
    },
    {
      'code': 'export const handleClick = (): void => {}; export const handleSubmit = (): void => {};',
      'filename': '/project/src/components/Button.ts',
      'name': '[constants] two top-level function consts -> not flagged (functions are not data constants)'
    },
    {
      'code': 'export const MAX = 3; export const handler = (): void => {};',
      'filename': '/project/src/http/handlers.ts',
      'name': '[constants] one data const and one function const -> only one real const remains, not flagged'
    },
    {
      'code': 'export const { ALPHA } = CONFIG;',
      'filename': '/project/src/http/single.ts',
      'name': '[constants] destructured object pattern with one bound name -> not flagged'
    },
    {
      'code': 'export const NumberMatchers = { isPositive: (v: number): boolean => v > 0, isNegative: (v: number): boolean => v < 0 }; export const StringMatchers = { isEmpty: (v: string): boolean => v.length === 0 };',
      'filename': '/project/src/matchers/matchers.ts',
      'name': '[constants] object-literal consts whose properties are all function-valued (matcher/dispatch-map namespaces) -> not flagged'
    },
    {
      'code': 'export const ajvInstance = new AjvClass({}); export const AjvClass = SomeAjvClass;',
      'filename': '/project/src/schemas/instance.ts',
      'name': '[constants] a new-constructed singleton const alongside a class-reference const -> not flagged'
    },
    {
      'code': 'export const defaultConfig = ConfigValidator.validate(); export const otherConfig = ConfigValidator.validateOther();',
      'filename': '/project/src/config/derived.ts',
      'name': '[constants] call-expression-derived consts -> not flagged'
    }
  ]
});
