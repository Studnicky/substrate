import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { singleExport } from '../../src/rules/singleExport.js';

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
    // ── named re-export with specifier matching filename ─────────────────────
    {
      name: 'allows single named re-export matching filename',
      code: "export { myHelper } from './utils.js';",
      filename: '/project/src/myHelper.ts'
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
    // ── only-types: all exports are type aliases or interfaces ───────────────
    {
      name: 'allows multiple type aliases and interface in a types file (only-types)',
      code: 'export type FooResult = string; export type BarResult = number; export interface BazContract { id: string; }',
      filename: '/project/src/resultTypes.ts'
    },
    {
      name: 'allows two type aliases in a non-index non-types-dir file (only-types)',
      code: 'export type Alpha = string; export type Beta = number;',
      filename: '/project/src/payloadShapes.ts'
    },
    {
      name: 'allows type-only re-exports (only-types via exportKind)',
      code: "export type { Foo } from './foo.js'; export type { Bar } from './bar.js';",
      filename: '/project/src/reexportedTypes.ts'
    },
    // ── only-constants: all exports are const with non-function initializers ─
    {
      name: 'allows multiple const value exports: object and primitive (only-constants)',
      code: 'export const CONFIG = { timeout: 3000, retries: 5 }; export const VERSION = "1.0.0";',
      filename: '/project/src/appConstants.ts'
    },
    {
      name: 'allows multiple const value exports: array and number (only-constants)',
      code: 'export const ALLOWED_METHODS = ["GET", "POST"]; export const MAX_SIZE = 1024;',
      filename: '/project/src/httpConstants.ts'
    },
    // ── only-enums: all exports are TSEnumDeclaration ────────────────────────
    {
      name: 'allows two enum exports in a file (only-enums)',
      code: 'export enum Direction { Up, Down } export enum Status { Active, Inactive }',
      filename: '/project/src/directionStatus.ts'
    },
    // ── only-error-classes: all exports are Error-extending classes ──────────
    {
      name: 'allows two Error-extending class exports (only-error-classes)',
      code: 'export class NotFoundError extends Error {} export class ValidationError extends Error {}',
      filename: '/project/src/domainErrors.ts'
    },
    {
      name: 'allows Error-subclass chain (extends BaseError) (only-error-classes)',
      code: 'export class ParseError extends BaseError {} export class FormatError extends BaseError {}',
      filename: '/project/src/parseErrors.ts'
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
      name: 'forbids one type alias and one class in same file (tooMany)',
      code: 'export type Foo = string; export class FooService {}',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/fooMixed.ts'
    },
    // ── tooMany: two functions ────────────────────────────────────────────────
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
    // ── directory no longer exempts: /errors/-style path + non-Error class + const ──
    {
      name: 'forbids non-error class + const in /errors/ path — directory no longer exempts (tooMany)',
      code: 'export class Parser {} export const DEFAULT_DELIMITER = ":";',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/errors/parser.ts'
    },
    // ── directory no longer exempts: /types/-style path + type + function ─────
    {
      name: 'forbids type alias + function in /types/ path — directory no longer exempts (tooMany)',
      code: 'export type FooShape = { id: string }; export function buildFoo(): FooShape { return { id: "" }; }',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/types/fooShape.ts'
    },
    // ── const-function is not only-constants: two arrow-function consts ───────
    {
      name: 'forbids two const arrow-function exports (not only-constants — tooMany)',
      code: 'export const doFoo = () => {}; export const doBar = () => {};',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/actions.ts'
    }
  ]
});
