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
    // One named export matching camelCase filename
    {
      name: 'allows single named export matching camelCase filename',
      code: 'export const myModule = 42;',
      filename: '/project/src/myModule.ts'
    },
    // One named export matching PascalCase class filename
    {
      name: 'allows single named export matching PascalCase class filename',
      code: 'export class MyService {}',
      filename: '/project/src/MyService.ts'
    },
    // One named export matching PascalCase interface filename
    {
      name: 'allows single named export matching PascalCase interface filename',
      code: 'export interface MyConfig { value: string; }',
      filename: '/project/src/MyConfig.ts'
    },
    // One named export matching PascalCase type alias filename
    {
      name: 'allows single named export matching PascalCase type alias filename',
      code: 'export type MyResult = { ok: boolean; };',
      filename: '/project/src/MyResult.ts'
    },
    // One named export matching PascalCase function filename
    {
      name: 'allows single named export matching PascalCase function filename',
      code: 'export function myHelper(): void {}',
      filename: '/project/src/myHelper.ts'
    },
    // index.ts is exempt (directory file)
    {
      name: 'allows multiple exports in index.ts (exempt file)',
      code: 'export const alpha = 1; export const beta = 2;',
      filename: '/project/src/index.ts'
    },
    // types.ts is exempt
    {
      name: 'allows multiple exports in types.ts (exempt file)',
      code: 'export type Foo = string; export type Bar = number;',
      filename: '/project/src/types.ts'
    },
    // Files in /types/ directory are exempt
    {
      name: 'allows multiple exports in /types/ directory (exempt directory)',
      code: 'export type Foo = string; export type Bar = number;',
      filename: '/project/src/types/foo.ts'
    },
    // Files in /interfaces/ directory are exempt
    {
      name: 'allows multiple exports in /interfaces/ directory (exempt directory)',
      code: 'export interface Foo { x: number; } export interface Bar { y: number; }',
      filename: '/project/src/interfaces/contracts.ts'
    },
    // Files in /constants/ directory are exempt
    {
      name: 'allows multiple exports in /constants/ directory (exempt directory)',
      code: 'export const MAX_RETRIES = 3; export const TIMEOUT_MS = 5000;',
      filename: '/project/src/constants/limits.ts'
    },
    // Files in /errors/ directory are exempt
    {
      name: 'allows multiple exports in /errors/ directory (exempt directory)',
      code: 'export class FooError extends Error {} export class BarError extends Error {}',
      filename: '/project/src/errors/all.ts'
    },
    // Zero-export file (no exports at all — rule should be silent)
    {
      name: 'allows zero-export file (no exports)',
      code: 'const x = 42;',
      filename: '/project/src/helper.ts'
    },
    // Named re-export with specifier matching filename
    {
      name: 'allows single named re-export matching filename',
      code: "export { myHelper } from './utils.js';",
      filename: '/project/src/myHelper.ts'
    },
    // .tsx filename with single export
    {
      name: 'allows single export from .tsx file matching filename',
      code: 'export const MyComponent = () => null;',
      filename: '/project/src/MyComponent.tsx'
    }
  ],
  invalid: [
    // Two named exports in a regular file
    {
      name: 'forbids two named exports in a regular file',
      code: 'export const alpha = 1;\nexport const beta = 2;',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/alpha.ts'
    },
    // Default export is forbidden
    {
      name: 'forbids default export',
      code: 'export default function myFn() {}',
      errors: [{ messageId: 'defaultExport' }],
      filename: '/project/src/myFn.ts'
    },
    // Export-all is forbidden
    {
      name: 'forbids export-all re-export',
      code: "export * from './other.js';",
      errors: [{ messageId: 'exportAll' }],
      filename: '/project/src/reexport.ts'
    },
    // Export name does not match filename
    {
      name: 'forbids export name that does not match filename',
      code: 'export const wrongName = 42;',
      errors: [{ messageId: 'mismatch' }],
      filename: '/project/src/rightName.ts'
    }
  ]
});
