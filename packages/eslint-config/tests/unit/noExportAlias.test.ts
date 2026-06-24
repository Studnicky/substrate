import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noExportAlias } from '../../src/rules/noExportAlias.js';

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
    code: 'export { FooType }',
    filename: '/project/src/fooType.ts',
    name: 'local export without alias'
  },
  {
    code: "export { FooType } from './foo'",
    filename: '/project/src/index.ts',
    name: 'index file re-export without alias'
  },
  {
    code: "export { FooType as FooType } from './foo'",
    filename: '/project/src/index.ts',
    name: 'index file re-export with same name'
  },
  {
    code: "export * from './foo'",
    filename: '/project/src/index.ts',
    name: 'star re-export inside index file'
  }
];

const invalidScenarios: InvalidScenarioType[] = [
  {
    code: 'export { FooType as BarType }',
    errors: [{ messageId: 'exportAlias' }],
    filename: '/project/src/fooType.ts',
    name: 'local export with alias'
  },
  {
    code: "export { FooType as BarType } from './foo'",
    errors: [{ messageId: 'exportAlias' }],
    filename: '/project/src/fooType.ts',
    name: 're-export with alias from non-index file'
  },
  {
    code: "export { FooType } from './foo'",
    errors: [{ messageId: 'reExportOutsideIndex' }],
    filename: '/project/src/fooType.ts',
    name: 're-export without alias from non-index file'
  },
  {
    code: "export * from './foo'",
    errors: [{ messageId: 'starReExportOutsideIndex' }],
    filename: '/project/src/fooType.ts',
    name: 'star re-export from non-index file'
  }
];

ruleTester.run('no-export-alias', noExportAlias, {
  invalid: invalidScenarios,
  valid: validScenarios
});
