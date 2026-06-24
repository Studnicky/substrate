import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceMustBeContract } from '../../src/rules/interfaceMustBeContract.js';

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

ruleTester.run('interface-must-be-contract', interfaceMustBeContract, {
  valid: [
    {
      name: 'interface with a method signature is a contract',
      code: `interface Runner { run(): void; }`
    },
    {
      name: 'interface with a call signature is a contract',
      code: `interface Factory { (): number; }`
    },
    {
      name: 'interface with a construct signature is a contract',
      code: `interface Ctor { new (): object; }`
    },
    {
      name: 'function-valued property is a non-serializable contract signal',
      code: `interface ClockSource { readonly clock?: () => number; }`
    },
    {
      name: 'constructor-typed property is a contract signal',
      code: `interface Builder { make: new () => object; }`
    },
    {
      name: 'named-type reference property is a contract signal',
      code: `interface WithLogger { logger: Logger; }`
    },
    {
      name: 'array of function types is a contract signal',
      code: `interface Transports { transports: ReadonlyArray<() => void>; }`
    },
    {
      name: 'allow option exempts a named pure-data interface',
      code: `interface LegacyShape { id: string; }`,
      options: [{ allow: ['LegacyShape'] }]
    }
  ],
  invalid: [
    {
      name: 'pure primitive data shape must be a type',
      code: `interface Point { x: number; y: number; }`,
      errors: [{ messageId: 'dataShapeMustBeType' }]
    },
    {
      name: 'empty interface is an empty record, not a contract',
      code: `interface Empty {}`,
      errors: [{ messageId: 'dataShapeMustBeType' }]
    },
    {
      name: 'nested object literal of primitives is still data',
      code: `interface Config { nested: { depth: number; label: string }; }`,
      errors: [{ messageId: 'dataShapeMustBeType' }]
    },
    {
      name: 'index signature of primitives is data',
      code: `interface Dict { [key: string]: number; }`,
      errors: [{ messageId: 'dataShapeMustBeType' }]
    },
    {
      name: 'array of primitives is data',
      code: `interface Bag { items: number[]; }`,
      errors: [{ messageId: 'dataShapeMustBeType' }]
    }
  ]
});
