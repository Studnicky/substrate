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
      code: 'export const myModule = 42;',
      filename: '/project/src/myModule.ts'
    },
    // One named export matching PascalCase class filename
    {
      code: 'export class MyService {}',
      filename: '/project/src/MyService.ts'
    },
    // One named export matching PascalCase interface filename
    {
      code: 'export interface MyConfig { value: string; }',
      filename: '/project/src/MyConfig.ts'
    },
    // One named export matching PascalCase type alias filename
    {
      code: 'export type MyResult = { ok: boolean; };',
      filename: '/project/src/MyResult.ts'
    },
    // One named export matching PascalCase function filename
    {
      code: 'export function myHelper(): void {}',
      filename: '/project/src/myHelper.ts'
    },
    // index.ts is exempt (directory file)
    {
      code: 'export const alpha = 1; export const beta = 2;',
      filename: '/project/src/index.ts'
    },
    // types.ts is exempt
    {
      code: 'export type Foo = string; export type Bar = number;',
      filename: '/project/src/types.ts'
    },
    // Files in /types/ directory are exempt
    {
      code: 'export type Foo = string; export type Bar = number;',
      filename: '/project/src/types/foo.ts'
    },
    // Files in /interfaces/ directory are exempt
    {
      code: 'export interface Foo { x: number; } export interface Bar { y: number; }',
      filename: '/project/src/interfaces/contracts.ts'
    },
    // Files in /constants/ directory are exempt
    {
      code: 'export const MAX_RETRIES = 3; export const TIMEOUT_MS = 5000;',
      filename: '/project/src/constants/limits.ts'
    },
    // Files in /errors/ directory are exempt
    {
      code: 'export class FooError extends Error {} export class BarError extends Error {}',
      filename: '/project/src/errors/all.ts'
    }
  ],
  invalid: [
    // Two named exports in a regular file
    {
      code: 'export const alpha = 1;\nexport const beta = 2;',
      errors: [{ messageId: 'tooMany' }],
      filename: '/project/src/alpha.ts'
    },
    // Default export is forbidden
    {
      code: 'export default function myFn() {}',
      errors: [{ messageId: 'defaultExport' }],
      filename: '/project/src/myFn.ts'
    },
    // Export-all is forbidden
    {
      code: "export * from './other.js';",
      errors: [{ messageId: 'exportAll' }],
      filename: '/project/src/reexport.ts'
    },
    // Export name does not match filename
    {
      code: 'export const wrongName = 42;',
      errors: [{ messageId: 'mismatch' }],
      filename: '/project/src/rightName.ts'
    }
  ]
});
