import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { singleExport } from '../../src/rules/singleExport.js';

// Workspace root — projectService resolves the tsconfig for the type-aware
// RuleTester instance below (matches the convention in noPreferExistingType.test.ts).
const repoRoot = resolve(import.meta.dirname, '../../../..');

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

// Type-aware RuleTester: used only to exercise the type-checker-backed
// Error-classification path in ExportClassifier.classify (real superclass-chain
// resolution via checker.isTypeAssignableTo, not name-based heuristics). The
// 'error-class' vs 'other-class' distinction is not currently branched on by
// any downstream consumer of exportKinds, so these cases cannot assert a
// differing messageId from the non-type-aware suite above — they instead prove
// the type-aware code path runs without crashing and does not regress the
// existing tooMany/mismatch/valid outcomes for real-Error-extending classes
// with non-Error-suffixed names, indirect Error inheritance, and
// Error-suffixed-but-non-Error classes.
const typeAwareRuleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts']
      },
      tsconfigRootDir: repoRoot
    }
  }
});

ruleTester.run('single-export', singleExport, {
  valid: [
    // ── single-export: basic matching cases ──────────────────────────────────
    {
      name: 'allows single named export matching camelCase filename',
      code: 'export const myModule = 42;',
      filename: '/project/src/myModule.ts'
    },
    {
      name: 'allows single named export matching PascalCase class filename',
      code: 'export class MyService {}',
      filename: '/project/src/MyService.ts'
    },
    {
      name: 'allows single named export matching PascalCase function filename',
      code: 'export function myHelper(): void {}',
      filename: '/project/src/myHelper.ts'
    },
    // ── single lone function file (must be VALID) ────────────────────────────
    {
      name: 'allows single lone function export whose name matches filename',
      code: 'export function ensureError(value: unknown): Error { return value instanceof Error ? value : new Error(String(value)); }',
      filename: '/project/src/ensureError.ts'
    },
    // ── single arrow-function const (one export, filename match — VALID) ─────
    {
      name: 'allows single exported arrow-function const matching filename',
      code: 'export const isActive = (v: unknown): v is boolean => typeof v === "boolean";',
      filename: '/project/src/isActive.ts'
    },
    // ── single namespace/entity file ─────────────────────────────────────────
    {
      name: 'allows single namespace export matching filename',
      code: 'export namespace UserEntity { export const x = 1; }',
      filename: '/project/src/UserEntity.ts'
    },
    // ── zero-export file ─────────────────────────────────────────────────────
    {
      name: 'allows zero-export file (no exports)',
      code: 'const x = 42;',
      filename: '/project/src/helper.ts'
    },
    // ── .tsx filename with single export ─────────────────────────────────────
    {
      name: 'allows single export from .tsx file matching filename',
      code: 'export const MyComponent = () => null;',
      filename: '/project/src/MyComponent.tsx'
    },
    // ── index file exempt ────────────────────────────────────────────────────
    {
      name: 'allows multiple exports in index.ts (index file exempt)',
      code: 'export const alpha = 1; export const beta = 2;',
      filename: '/project/src/index.ts'
    },
    {
      name: 'allows multiple exports in index.tsx (index file exempt)',
      code: 'export const A = 1; export const B = 2;',
      filename: '/project/src/index.tsx'
    },
    {
      name: 'allows multiple exports in index.cts (index file exempt)',
      code: 'export const A = 1; export const B = 2;',
      filename: '/project/src/index.cts'
    },
    {
      name: 'allows multiple exports in index.mts (index file exempt)',
      code: 'export const A = 1; export const B = 2;',
      filename: '/project/src/index.mts'
    },
    {
      name: 'allows many named re-exports in index.ts (index file exempt)',
      code: "export { alpha } from './alpha.js'; export { beta } from './beta.js'; export { gamma } from './gamma.js';",
      filename: '/project/src/index.ts'
    },
    {
      name: 'allows export-all re-export in index.ts (index files may re-export freely)',
      code: "export * from './other.js';",
      filename: '/project/src/index.ts'
    },
    {
      name: 'allows mixed exports in /entities/ files',
      code: 'export const UserEntitySchema = {}; export type UserEntity = { id: string }; export function validateUserEntity(): boolean { return true; }',
      filename: '/project/src/entities/UserEntity.ts'
    },
    {
      name: 'allows mixed exports in /errors/ files',
      code: 'export class DomainError extends Error {} export const ERROR_CODE = "domain";',
      filename: '/project/src/errors/domain.ts'
    },
    {
      name: 'allows mixed exports in /interfaces/ files',
      code: 'export interface UserContract { id: string; } export const USER_INTERFACE_VERSION = 1;',
      filename: '/project/src/interfaces/user.ts'
    },
    {
      name: 'allows mixed exports in /types/ files',
      code: 'export type FooResult = string; export type BarResult = number; export interface BazContract { id: string; }',
      filename: '/project/src/types/resultTypes.ts'
    },
    {
      name: 'allows mixed exports in /constants/ files',
      code: 'export const MAX_SIZE = 1024; export const DEFAULT_TIMEOUT = 1000;',
      filename: '/project/src/constants/storage.ts'
    },
    {
      name: 'allows fractal constants modules by filename suffix',
      code: 'export const DEFAULT_TIMEOUT = 1000; export const MAX_RETRIES = 3;',
      filename: '/project/src/http/client.constants.ts'
    },
    {
      name: 'allows top-level restricted topology by filename suffix for types',
      code: 'export type RequestShape = { id: string }; export interface ResponseShape { ok: boolean; }',
      filename: '/project/src/http.contract.types.ts'
    },
    {
      name: 'allows enum files that export only enums and const values',
      code: 'export enum Direction { Up, Down } export const DEFAULT_DIRECTION = Direction.Up; export enum Status { Active, Inactive }',
      filename: '/project/src/directionStatus.ts'
    },
    // ── single non-error class file (filename matches) ───────────────────────
    {
      name: 'allows single non-error class export matching filename',
      code: 'export class UserRepository {}',
      filename: '/project/src/UserRepository.ts'
    }
  ],
  invalid: [
    // ── tooMany: mixed type + class ───────────────────────────────────────────
    {
      name: 'forbids one type alias and one class in same regular file (tooMany)',
      code: 'export type Foo = string; export class FooService {}',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/fooMixed.ts'
    },
    {
      name: 'forbids two type aliases in a regular file',
      code: 'export type Alpha = string; export type Beta = number;',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/payloadShapes.ts'
    },
    {
      name: 'forbids type-only re-exports in a regular file',
      code: "export type { Foo } from './foo.js'; export type { Bar } from './bar.js';",
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/reexportedTypes.ts'
    },
    {
      name: 'forbids multiple const value exports in a regular file',
      code: 'export const CONFIG = { timeout: 3000, retries: 5 }; export const VERSION = "1.0.0";',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/appConstants.ts'
    },
    {
      name: 'forbids lower camel case exports in /constants/ files',
      code: 'export const maxSize = 1024;',
      errors: [{ messageId: 'constantsCase' }],
      filename: '/project/src/constants/storage.ts'
    },
    {
      name: 'forbids function exports in /constants/ files unless they use constant naming',
      code: 'export const MAX_SIZE = 1024; export function asKilobytes(value: number): number { return value / 1024; }',
      errors: [{ messageId: 'constantsCase' }],
      filename: '/project/src/constants/storage.ts'
    },
    {
      name: 'forbids lower camel case exports in fractal constants modules',
      code: 'export const defaultTimeout = 1000; export const MAX_RETRIES = 3;',
      errors: [{ messageId: 'constantsCase' }],
      filename: '/project/src/http/client.constants.ts'
    },
    {
      name: 'forbids two Error-extending class exports in a regular file',
      code: 'export class NotFoundError extends Error {} export class ValidationError extends Error {}',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/domainErrors.ts'
    },
    // ── tooMany: two functions ────────────────────────────────────────────────
    {
      name: 'forbids enum files with function exports outside exempt directories',
      code: 'export enum Direction { Up, Down } export const DEFAULT_DIRECTION = Direction.Up; export function isVertical(): boolean { return true; }',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/directionStatus.ts'
    },
    {
      name: 'forbids two function exports in same file (tooMany)',
      code: 'export function parseOne(): void {} export function parseTwo(): void {}',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/parsers.ts'
    },
    // ── tooMany: function + class ─────────────────────────────────────────────
    {
      name: 'forbids function and class export in same file (tooMany)',
      code: 'export function buildFoo(): void {} export class FooBuilder {}',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/fooBuilder.ts'
    },
    // ── tooMany: non-error class + const ─────────────────────────────────────
    {
      name: 'forbids non-error class and const in same file (tooMany)',
      code: 'export class Parser {} export const DEFAULT_OPTIONS = {};',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/parser.ts'
    },
    // ── tooMany: two named class exports in a regular file ───────────────────
    {
      name: 'forbids two non-error class exports in a regular file (tooMany)',
      code: 'export class Alpha {}\nexport class Beta {}',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/alpha.ts'
    },
    // ── mismatch: single class whose name mismatches filename ─────────────────
    {
      name: 'forbids single class export whose name does not match filename (mismatch)',
      code: 'export class WrongName {}',
      errors: [{ messageId: 'mismatch' }],
      filename: '/project/src/rightName.ts'
    },
    {
      name: 'forbids single class export not matching filename (mismatch)',
      code: 'export class FooService {}',
      errors: [{ messageId: 'mismatch' }],
      filename: '/project/src/BarService.ts'
    },
    // ── defaultExport: always forbidden ──────────────────────────────────────
    {
      name: 'forbids default export',
      code: 'export default function myFn() {}',
      errors: [{ messageId: 'defaultExport' }],
      filename: '/project/src/myFn.ts'
    },
    // ── exportAll: forbidden in non-index files ───────────────────────────────
    {
      name: 'forbids export-all re-export in a regular file',
      code: "export * from './other.js';",
      errors: [{ messageId: 'exportAll' }],
      filename: '/project/src/reexport.ts'
    },
    // ── directory does not exempt: /errors/-style path + non-Error class + const ──
    {
      name: 'forbids single export name mismatch in a regular file',
      code: 'export function buildFoo(): void {}',
      errors: [{ messageId: 'mismatch' }],
      filename: '/project/src/parseFoo.ts'
    },
    {
      name: 'forbids const-function exports as multiple symbols in regular files',
      code: 'export const doFoo = () => {}; export const doBar = () => {};',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/actions.ts'
    },
    {
      name: 'forbids export-all re-export in exempt directories',
      code: "export * from './other.js';",
      errors: [{ messageId: 'exportAll' }],
      filename: '/project/src/types/reexport.ts'
    }
  ]
});

typeAwareRuleTester.run('single-export (type-aware Error classification)', singleExport, {
  valid: [
    // Exercises the type-aware Error-classification path directly: the
    // superclass name is 'Error' itself, so checker.isTypeAssignableTo
    // resolves the class type against the real global Error type.
    {
      name: 'allows single class export directly extending the real global Error',
      code: 'export class FooError extends Error {}',
      filename: 'FooError.ts'
    },
    // Indirect inheritance through a non-Error-suffixed intermediate base class.
    // Proves checker.isTypeAssignableTo (or the getBaseTypes fallback) walks the
    // full superclass chain to resolve real Error ancestry without crashing —
    // a naming heuristic would misclassify this ('ConnectionProblem' has no
    // 'Error' suffix and its direct superclass is 'CustomFailure', not 'Error').
    {
      name: 'allows single class export indirectly extending Error through a non-Error-suffixed base',
      code: 'class CustomFailure extends Error {}\nexport class ConnectionProblem extends CustomFailure {}',
      filename: 'ConnectionProblem.ts'
    },
    // Reverse case: the name ends in 'Error' but the class has no superclass at
    // all. Proves the type-aware path does not misfire on naming alone and does
    // not crash when there is nothing to resolve.
    {
      name: 'allows single class export named with an Error suffix but extending nothing',
      code: 'export class ColorError {}',
      filename: 'ColorError.ts'
    }
  ],
  invalid: []
});
