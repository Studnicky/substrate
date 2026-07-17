import type { Rule } from 'eslint';

import { argumentsObject } from './rules/v8/argumentsObject.js';
import { arrayConcatOutsideLoops } from './rules/v8/arrayConcatOutsideLoops.js';
import { arrayFromIterators } from './rules/v8/arrayFromIterators.js';
import { arrayFromMapCallback } from './rules/v8/arrayFromMapCallback.js';
import { arrayScanOutsideLoops } from './rules/v8/arrayScanOutsideLoops.js';
import { arraySpliceOutsideLoops } from './rules/v8/arraySpliceOutsideLoops.js';
import { arraySpreadOutsideLoops } from './rules/v8/arraySpreadOutsideLoops.js';
import { chainedArrayIteration } from './rules/v8/chainedArrayIteration.js';
import { computedClassProperties } from './rules/v8/computedClassProperties.js';
import { computedObjectProperties } from './rules/v8/computedObjectProperties.js';
import { conditionalPropertyAssignment } from './rules/v8/conditionalPropertyAssignment.js';
import { defineProperty } from './rules/v8/defineProperty.js';
import { deleteProperty } from './rules/v8/deleteProperty.js';
import { dynamicPropertyAccess } from './rules/v8/dynamicPropertyAccess.js';
import { evalFunction } from './rules/v8/evalFunction.js';
import { forInLoops } from './rules/v8/forInLoops.js';
import { forOfArrays } from './rules/v8/forOfArrays.js';
import { inlineArrowFunctions } from './rules/v8/inlineArrowFunctions.js';
import { inlineFunctions } from './rules/v8/inlineFunctions.js';
import { maxSwitchCases } from './rules/v8/maxSwitchCases.js';
import { memoizeArrayLength } from './rules/v8/memoizeArrayLength.js';
import { objectSpread } from './rules/v8/objectSpread.js';
import { prototypeModification } from './rules/v8/prototypeModification.js';
import { regexpInLoops } from './rules/v8/regexpInLoops.js';
import { switchStatements } from './rules/v8/switchStatements.js';
import { tryCatchInLoops } from './rules/v8/tryCatchInLoops.js';
import { withStatement } from './rules/v8/withStatement.js';

export const v8Plugin: { readonly 'rules': Record<string, Rule.RuleModule> } = {
  'rules': {
    'arguments-object': argumentsObject,
    'array-concat-outside-loops': arrayConcatOutsideLoops,
    'array-from-iterators': arrayFromIterators,
    'array-from-map-callback': arrayFromMapCallback,
    'array-scan-outside-loops': arrayScanOutsideLoops,
    'array-splice-outside-loops': arraySpliceOutsideLoops,
    'array-spread-outside-loops': arraySpreadOutsideLoops,
    'chained-array-iteration': chainedArrayIteration,
    'computed-class-properties': computedClassProperties,
    'computed-object-properties': computedObjectProperties,
    'conditional-property-assignment': conditionalPropertyAssignment,
    'define-property': defineProperty,
    'delete-property': deleteProperty,
    'dynamic-property-access': dynamicPropertyAccess,
    'eval-function': evalFunction,
    'for-in-loops': forInLoops,
    'for-of-arrays': forOfArrays,
    'inline-arrow-functions': inlineArrowFunctions,
    'inline-functions': inlineFunctions,
    'max-switch-cases': maxSwitchCases,
    'memoize-array-length': memoizeArrayLength,
    'object-spread': objectSpread,
    'prototype-modification': prototypeModification,
    'regexp-in-loops': regexpInLoops,
    'switch-statements': switchStatements,
    'try-catch-in-loops': tryCatchInLoops,
    'with-statement': withStatement
  }
};
