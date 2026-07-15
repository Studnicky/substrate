import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noFreestandingVerbNoun } from '../../src/rules/noFreestandingVerbNoun.js';

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

const validScenarios = [
  {
    name: 'class static method — not freestanding',
    code: `class Foo { static makeThing() {} }`
  },
  {
    name: 'calling a verbNoun function — not a declaration',
    code: `const result = makeConfig();`
  },
  {
    name: 'non-function variable — object literal',
    code: `const DEFAULT_VALUE = {};`
  },
  {
    name: 'non-function variable — verbNoun name assigned a non-function',
    code: `const makeX = someOtherValue;`
  },
  {
    name: 'import of verbNoun — not a declaration',
    code: `import { makeX } from './other.js';`
  },
  {
    name: 'import default of verbNoun — not a declaration',
    code: `import makeX from './other.js';`
  },
  {
    name: 'non-verb-noun function declaration',
    code: `function renderItems() {}`
  },
  {
    name: 'nested function — not at module scope',
    code: `class Builder { static of() { function makeHelper() {} return makeHelper; } }`
  },
  {
    name: 'arrow inside class method — not at module scope',
    code: `class Foo { run() { const makeLocal = () => 1; return makeLocal(); } }`
  },
  {
    name: 'verbNoun followed by lowercase — not caught',
    code: `function makeconfig() {}`
  },
  {
    name: 'verb prefix only — exact prefix, no noun',
    code: `function make() {}`
  }
];

type InvalidScenarioType = {
  readonly name: string;
  readonly code: string;
  readonly errors: ReadonlyArray<{ readonly messageId: string }>;
};

const invalidScenarios: InvalidScenarioType[] = [
  {
    name: 'FunctionDeclaration with make prefix',
    code: `function makeNode(d) { return d; }`,
    errors: [{ messageId: 'verbNoun' }]
  },
  {
    name: 'const arrow with build prefix',
    code: `const buildDag = (n) => n;`,
    errors: [{ messageId: 'verbNoun' }]
  },
  {
    name: 'const FunctionExpression with validate prefix',
    code: `const validateMaxEvents = function(v) { return v > 0; };`,
    errors: [{ messageId: 'verbNoun' }]
  },
  {
    name: 'async arrow with create prefix',
    code: `const createUser = async (data) => data;`,
    errors: [{ messageId: 'verbNoun' }]
  },
  {
    name: 'FunctionDeclaration with from prefix',
    code: `function fromSchema(s) { return s; }`,
    errors: [{ messageId: 'verbNoun' }]
  },
  {
    name: 'FunctionDeclaration with parse prefix',
    code: `function parseResponse(r) { return r; }`,
    errors: [{ messageId: 'verbNoun' }]
  },
  {
    name: 'const arrow with get prefix',
    code: `const getItems = () => [];`,
    errors: [{ messageId: 'verbNoun' }]
  },
  {
    name: 'const arrow with format prefix',
    code: `const formatDate = (d) => d.toISOString();`,
    errors: [{ messageId: 'verbNoun' }]
  },
  {
    name: 'exported FunctionDeclaration with make prefix',
    code: `export function makeUser() {}`,
    errors: [{ messageId: 'verbNoun' }]
  },
  {
    name: 'exported const arrow with make prefix',
    code: `export const makeUser = () => {};`,
    errors: [{ messageId: 'verbNoun' }]
  }
];

ruleTester.run('no-freestanding-verb-noun', noFreestandingVerbNoun, {
  invalid: invalidScenarios,
  valid: validScenarios
});
