import type { Linter, Rule } from 'eslint';

import stylistic from '@stylistic/eslint-plugin';
import importX from 'eslint-plugin-import-x';
import perfectionistPlugin from 'eslint-plugin-perfectionist';
import regexp from 'eslint-plugin-regexp';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

import { plugin } from './plugin.js';
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

export { plugin } from './plugin.js';
export { noThisAlias } from './rules/arch/noThisAlias.js';
export { entityNamespace } from './rules/entityNamespace.js';
export { interfaceMustBeContract } from './rules/interfaceMustBeContract.js';
export { noBindApplyCall } from './rules/noBindApplyCall.js';
export { noSuppressionComments } from './rules/noSuppressionComments.js';
export { noTrivialShim } from './rules/noTrivialShim.js';
export { singleExport } from './rules/singleExport.js';
export { typeAliasMustEndType } from './rules/typeAliasMustEndType.js';

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

export type EslintConfigOptionsType = {
  readonly 'tsconfigRootDir'?: string;
};

export const createEslintConfig = (options?: EslintConfigOptionsType): Linter.Config[] => {
  const result = tseslint.config(
    {
      'ignores': [
        '**/dist/**',
        '**/node_modules/**',
        '**/*.d.ts'
      ]
    },
    {
      'files': ['packages/*/src/**/*.ts'],
      'languageOptions': {
        'parser': tseslint.parser,
        'parserOptions': {
          'projectService': true,
          'tsconfigRootDir': options?.tsconfigRootDir ?? process.cwd()
        }
      },
      'linterOptions': {
        'reportUnusedDisableDirectives': 'error'
      },
      'plugins': {
        '@studnicky': plugin,
        '@studnicky/v8': v8Plugin,
        '@stylistic': stylistic,
        'import-x': importX,
        'perfectionist': perfectionistPlugin,
        'regexp': regexp,
        'unused-imports': unusedImports,
        ...tseslint.plugin ? { '@typescript-eslint': tseslint.plugin } : {}
      },
      'rules': {
        // @studnicky custom rules
        '@studnicky/entity-namespace': 'error',
        '@studnicky/interface-must-be-contract': 'error',
        '@studnicky/no-bind-apply-call': 'error',
        '@studnicky/no-suppression-comments': 'error',
        '@studnicky/no-this-alias': 'error',
        // no-trivial-shim is intentionally disabled: it over-fires on legitimate
        // factory/accessor methods that return object/array literals or spreads,
        // and has no working autofix for those cases. Available via the plugin if
        // a project wants to opt in.
        '@studnicky/no-trivial-shim': 'off',
        '@studnicky/single-export': 'error',
        '@studnicky/type-alias-must-end-type': 'error',
        // @studnicky/v8 optimisation rules
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
        '@studnicky/v8/with-statement': 'error',
        // @stylistic
        '@stylistic/comma-dangle': ['error', 'never'],
        '@stylistic/eol-last': ['error', 'always'],

        '@stylistic/indent': ['error', 2],
        '@stylistic/no-trailing-spaces': 'error',
        '@stylistic/quote-props': ['error', 'always'],
        '@stylistic/quotes': ['error', 'single', { 'avoidEscape': true }],
        '@stylistic/semi': ['error', 'always'],
        // @typescript-eslint — auto-fixable set
        '@typescript-eslint/array-type': ['error', { 'default': 'array' }],
        '@typescript-eslint/consistent-type-exports': 'error',
        '@typescript-eslint/consistent-type-imports': ['error', { 'fixStyle': 'separate-type-imports' }],
        '@typescript-eslint/dot-notation': 'error',
        '@typescript-eslint/naming-convention': [
          'error',
          {
            'custom': { 'match': true, 'regex': 'Interface$' },
            'format': ['PascalCase'],
            'selector': 'interface'
          },
          {
            'format': ['PascalCase'],
            'selector': 'typeAlias'
          }
        ],
        '@typescript-eslint/no-inferrable-types': 'error',
        '@typescript-eslint/no-meaningless-void-operator': 'error',
        '@typescript-eslint/no-unnecessary-type-assertion': 'error',
        '@typescript-eslint/no-unnecessary-type-constraint': 'error',
        '@typescript-eslint/no-unused-vars': ['error', {
          // `_`-prefixed args are intentionally-unused parameters on no-op
          // template-method/lifecycle hooks that subclasses override.
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^(_|[A-Z][A-Za-z]*Schema$|[A-Za-z]*Interface$|[A-Za-z]*Type$)'
        }],
        '@typescript-eslint/no-useless-empty-export': 'error',
        '@typescript-eslint/non-nullable-type-assertion-style': 'error',

        '@typescript-eslint/prefer-as-const': 'error',
        '@typescript-eslint/prefer-function-type': 'error',
        '@typescript-eslint/prefer-nullish-coalescing': 'error',
        '@typescript-eslint/prefer-optional-chain': 'error',

        '@typescript-eslint/return-await': ['error', 'always'],
        // import-x
        'import-x/newline-after-import': 'error',
        'import-x/no-default-export': 'error',
        // Core
        'no-extra-bind': 'error',
        'no-lonely-if': 'error',
        'no-var': 'error',
        'object-shorthand': ['error', 'never'],
        'perfectionist/sort-classes': 'off',
        // Perfectionist sorting
        'perfectionist/sort-enums': 'error',
        'perfectionist/sort-exports': 'error',
        'perfectionist/sort-imports': 'error',

        'perfectionist/sort-interfaces': 'error',
        'perfectionist/sort-modules': 'off',
        'perfectionist/sort-named-exports': 'error',
        'perfectionist/sort-named-imports': 'error',
        'perfectionist/sort-object-types': 'error',
        'perfectionist/sort-objects': 'error',
        'perfectionist/sort-union-types': 'off',

        'prefer-const': 'error',
        'prefer-template': 'error',

        // regexp
        'regexp/no-unused-capturing-group': 'error',

        'regexp/no-useless-flag': 'error',
        'regexp/prefer-regexp-exec': 'error',
        // unused-imports
        'unused-imports/no-unused-imports': 'error'
      }
    },
    // Test files — parse with TS parser (no type-checking) and relax rules
    {
      'files': ['packages/*/tests/**/*.ts'],
      'languageOptions': {
        'parser': tseslint.parser,
        'parserOptions': {
          'project': false
        }
      },
      'rules': {
        '@studnicky/no-trivial-shim': 'off',
        '@studnicky/single-export': 'off',
        '@studnicky/v8/for-of-arrays': 'off',
        '@typescript-eslint/consistent-type-exports': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/dot-notation': 'off',
        '@typescript-eslint/no-magic-numbers': 'off',
        '@typescript-eslint/no-meaningless-void-operator': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/non-nullable-type-assertion-style': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/return-await': 'off'
      }
    },
    // Config-file overrides — allow default exports in config files
    {
      'files': ['eslint.config.*', '*.config.*', '*.config.mjs'],
      'rules': {
        '@studnicky/single-export': 'off',
        'import-x/no-default-export': 'off'
      }
    }
  ) as Linter.Config[];
  return result;
};
