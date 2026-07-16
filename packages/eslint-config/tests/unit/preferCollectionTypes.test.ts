import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { preferCollectionTypes } from '../../src/rules/preferCollectionTypes.js';

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

type InvalidScenarioType = {
  readonly name: string;
  readonly code: string;
  readonly errors: ReadonlyArray<{ readonly messageId: string; readonly data?: Record<string, string> }>;
};

const validScenarios = [
  {
    name: 'Set.has — already using Set',
    code: `const s = new Set(['a', 'b']); s.has(x);`
  },
  {
    name: 'Map.get — already using Map',
    code: `const m = new Map(entries); m.get(key);`
  },
  {
    name: 'arr.includes where arr is a parameter — not inline literal',
    code: `function check(arr: string[], val: string): boolean { return arr.includes(val); }`
  },
  {
    name: 'const array used for .map — more than membership',
    code: `const data = ['a', 'b']; const result = data.map(x => x.toUpperCase());`
  },
  {
    name: 'const array used for .includes and also for .map — not flagged',
    code: `const data = ['a', 'b']; const has = data.includes('a'); const mapped = data.map(x => x);`
  },
  {
    name: 'Object.fromEntries accessed via dot notation — not computed',
    code: `const obj = Object.fromEntries(pairs); const val = obj.key;`
  },
  {
    name: 'string.includes — not an array',
    code: `const s = 'hello world'; s.includes('hello');`
  },
  {
    name: 'filter callback using named set — no array literal inside callback',
    code: `const allowed = new Set(['a', 'b']); arr.filter(x => allowed.has(x));`
  }
];

const invalidScenarios: InvalidScenarioType[] = [
  {
    name: 'Pattern A — inline array literal with .includes()',
    code: `const found = ['a', 'b', 'c'].includes(x);`,
    errors: [{ messageId: 'arrayLiteralIncludes' }]
  },
  {
    name: 'Pattern A — inline array literal with .indexOf() !== -1',
    code: `const found = ['a', 'b', 'c'].indexOf(x) !== -1;`,
    errors: [{ messageId: 'arrayLiteralIncludes' }]
  },
  {
    name: 'Pattern A — inline array literal with .indexOf() > -1',
    code: `const found = ['a', 'b', 'c'].indexOf(x) > -1;`,
    errors: [{ messageId: 'arrayLiteralIncludes' }]
  },
  {
    name: 'Pattern A — inline array literal with .includes() in condition',
    code: `if (['x', 'y', 'z'].includes(val)) { return true; }`,
    errors: [{ messageId: 'arrayLiteralIncludes' }]
  },
  {
    name: 'Pattern B — Object.fromEntries() accessed inline via bracket',
    code: `const val = Object.fromEntries(pairs)[key];`,
    errors: [{ messageId: 'fromEntriesWithBracket' }]
  },
  {
    name: 'Pattern B — Object.fromEntries() accessed inline via bracket in expression',
    code: `return Object.fromEntries(entries)[name];`,
    errors: [{ messageId: 'fromEntriesWithBracket' }]
  },
  {
    name: 'Pattern C — module-scope const array used only for .includes()',
    code: `const VALID = ['x', 'y', 'z']; VALID.includes(val);`,
    errors: [{ messageId: 'constantArrayForMembership', data: { name: 'VALID' } }]
  },
  {
    name: 'Pattern C — module-scope const array used only for .includes() twice',
    code: `const ROLES = ['admin', 'user']; ROLES.includes(r1); ROLES.includes(r2);`,
    errors: [{ messageId: 'constantArrayForMembership', data: { name: 'ROLES' } }]
  },
  {
    // Pattern D fires on the outer iteration call; Pattern A also fires on the inner array.includes()
    name: 'Pattern D — .filter() callback contains inline array .includes()',
    code: `const result = arr.filter(x => ['a', 'b'].includes(x));`,
    errors: [
      { messageId: 'includesInCallback' },
      { messageId: 'arrayLiteralIncludes' }
    ]
  },
  {
    name: 'Pattern D — .some() callback contains inline array .includes()',
    code: `const found = arr.some(x => ['a', 'b', 'c'].includes(x));`,
    errors: [
      { messageId: 'includesInCallback' },
      { messageId: 'arrayLiteralIncludes' }
    ]
  },
  {
    name: 'Pattern D — .every() callback contains inline array .includes()',
    code: `const allValid = arr.every(x => ['yes', 'no'].includes(x));`,
    errors: [
      { messageId: 'includesInCallback' },
      { messageId: 'arrayLiteralIncludes' }
    ]
  },
  {
    name: 'Pattern D — .find() callback contains inline array .includes()',
    code: `const item = arr.find(x => ['alpha', 'beta'].includes(x));`,
    errors: [
      { messageId: 'includesInCallback' },
      { messageId: 'arrayLiteralIncludes' }
    ]
  },
  {
    name: 'Pattern D — nested iteration calls both flagged from one inline match (stack-based tracker regression guard)',
    code: `const result = arr.filter(x => arr2.some(y => ['a', 'b'].includes(y)));`,
    errors: [
      { messageId: 'includesInCallback' },
      { messageId: 'includesInCallback' },
      { messageId: 'arrayLiteralIncludes' }
    ]
  }
];

ruleTester.run('prefer-collection-types', preferCollectionTypes, {
  invalid: invalidScenarios,
  valid: validScenarios
});
