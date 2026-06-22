import type { Linter } from 'eslint';

import stylistic from '@stylistic/eslint-plugin';
import importX from 'eslint-plugin-import-x';
import perfectionistPlugin from 'eslint-plugin-perfectionist';
import regexp from 'eslint-plugin-regexp';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

import { plugin } from './plugin.js';

export { plugin } from './plugin.js';
export { noThisAlias } from './rules/arch/noThisAlias.js';
export { entityNamespace } from './rules/entityNamespace.js';
export { interfaceMustBeContract } from './rules/interfaceMustBeContract.js';
export { noBindApplyCall } from './rules/noBindApplyCall.js';
export { noSuppressionComments } from './rules/noSuppressionComments.js';
export { noTrivialShim } from './rules/noTrivialShim.js';
export { singleExport } from './rules/singleExport.js';
export { typeAliasMustEndType } from './rules/typeAliasMustEndType.js';

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
        // no-trivial-shim is intentionally disabled: it over-fires on legitimate
        // factory/accessor methods that return object/array literals or spreads,
        // and has no working autofix for those cases. Available via the plugin if
        // a project wants to opt in.
        '@studnicky/no-trivial-shim': 'off',
        '@studnicky/single-export': 'error',
        '@studnicky/type-alias-must-end-type': 'error',
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
        '@typescript-eslint/consistent-type-exports': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/dot-notation': 'off',
        '@typescript-eslint/naming-convention': 'off',
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
