import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { canonicalExportNames } from '../../src/rules/canonicalExportNames.js';

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
  },
  {
    code: "import { FooType } from './foo'; export { FooType };",
    filename: '/project/src/index.ts',
    name: 'index file may export imported binding'
  },
  {
    code: "import type { FooType } from './foo'; export type { FooType };",
    filename: '/project/src/index.ts',
    name: 'index file may export imported type binding'
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
  },
  {
    code: "import { FooType } from './foo'; export { FooType };",
    errors: [{ messageId: 'exportImportedBindingOutsideIndex' }],
    filename: '/project/src/fooType.ts',
    name: 'import then export value binding from non-index file'
  },
  {
    code: "import type { FooType } from './foo'; export type { FooType };",
    errors: [{ messageId: 'exportImportedBindingOutsideIndex' }],
    filename: '/project/src/fooType.ts',
    name: 'import then export type binding from non-index file'
  },
  {
    code: "import { FooType as LocalFooType } from './foo'; export { LocalFooType };",
    errors: [{ messageId: 'exportImportedBindingOutsideIndex' }],
    filename: '/project/src/fooType.ts',
    name: 'import alias then export binding from non-index file'
  }
];

ruleTester.run('canonical-export-names', canonicalExportNames, {
  invalid: invalidScenarios,
  valid: validScenarios
});
