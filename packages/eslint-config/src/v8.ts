import type { Linter, Rule } from 'eslint';

import { argumentsObject } from './rules/v8/argumentsObject.js';
import { arrayFromIterators } from './rules/v8/arrayFromIterators.js';
import { computedClassProperties } from './rules/v8/computedClassProperties.js';
import { computedObjectProperties } from './rules/v8/computedObjectProperties.js';
import { defineProperty } from './rules/v8/defineProperty.js';
import { deleteProperty } from './rules/v8/deleteProperty.js';
import { evalFunction } from './rules/v8/evalFunction.js';
import { forInLoops } from './rules/v8/forInLoops.js';
import { forOfArrays } from './rules/v8/forOfArrays.js';
import { memoizeArrayLength } from './rules/v8/memoizeArrayLength.js';
import { noConcatInLoops } from './rules/v8/noConcatInLoops.js';
import { noSpreadInLoops } from './rules/v8/noSpreadInLoops.js';
import { prototypeModification } from './rules/v8/prototypeModification.js';
import { regexpInLoops } from './rules/v8/regexpInLoops.js';
import { switchStatements } from './rules/v8/switchStatements.js';
import { tryCatchInLoops } from './rules/v8/tryCatchInLoops.js';
import { withStatement } from './rules/v8/withStatement.js';

const v8Plugin: { readonly 'rules': Record<string, Rule.RuleModule> } = {
  'rules': {
    'arguments-object': argumentsObject,
    'array-from-iterators': arrayFromIterators,
    'computed-class-properties': computedClassProperties,
    'computed-object-properties': computedObjectProperties,
    'define-property': defineProperty,
    'delete-property': deleteProperty,
    'eval-function': evalFunction,
    'for-in-loops': forInLoops,
    'for-of-arrays': forOfArrays,
    'memoize-array-length': memoizeArrayLength,
    'no-concat-in-loops': noConcatInLoops,
    'no-spread-in-loops': noSpreadInLoops,
    'prototype-modification': prototypeModification,
    'regexp-in-loops': regexpInLoops,
    'switch-statements': switchStatements,
    'try-catch-in-loops': tryCatchInLoops,
    'with-statement': withStatement
  }
};

export const v8: Linter.Config[] = [
  {
    'plugins': {
      '@studnicky/v8': v8Plugin
    },
    'rules': {
      '@studnicky/v8/arguments-object': 'error',
      '@studnicky/v8/array-from-iterators': 'error',
      '@studnicky/v8/computed-class-properties': 'error',
      '@studnicky/v8/computed-object-properties': 'error',
      '@studnicky/v8/define-property': 'error',
      '@studnicky/v8/delete-property': 'error',
      '@studnicky/v8/eval-function': 'error',
      '@studnicky/v8/for-in-loops': 'error',
      '@studnicky/v8/for-of-arrays': 'error',
      '@studnicky/v8/memoize-array-length': 'error',
      '@studnicky/v8/no-concat-in-loops': 'error',
      '@studnicky/v8/no-spread-in-loops': 'error',
      '@studnicky/v8/prototype-modification': 'error',
      '@studnicky/v8/regexp-in-loops': 'error',
      '@studnicky/v8/switch-statements': 'error',
      '@studnicky/v8/try-catch-in-loops': 'error',
      '@studnicky/v8/with-statement': 'error'
    }
  }
];
