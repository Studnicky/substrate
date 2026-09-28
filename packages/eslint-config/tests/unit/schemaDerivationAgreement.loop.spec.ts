import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter } from 'eslint';
import parser from '@typescript-eslint/parser';

import { allTypesAreEntities } from '../../src/rules/allTypesAreEntities.js';
import { entityFileShape } from '../../src/rules/entityFileShape.js';
import { typeAliasInvariants } from '../../src/rules/typeAliasInvariants.js';

// entity-file-shape, type-alias-invariants, and all-types-are-entities all consult
// SchemaMemberGuards.isJustifiedHandWrittenEntityType for the same declaration. This file
// asserts the SAME source against all three, so a future change to any one implementation
// that reintroduces disagreement fails here rather than surfacing as a cross-rule contradiction.

const repoRoot = resolve(import.meta.dirname, '../../../..');

const typeAwareLanguageOptions = {
  parser,
  parserOptions: {
    projectService: {
      allowDefaultProject: ['*.ts', 'packages/eslint-config/*.ts', 'src/entities/*.ts'],
      maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30
    },
    tsconfigRootDir: repoRoot
  }
};

const syntaxOnlyLanguageOptions = {
  parser,
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' }
};

const COMPOSED_TYPE_ACCEPTED_SOURCE = "import { EntityCompiler } from '@studnicky/entity/node';\nimport { PatchOperationEntity } from './PatchOperationEntity.js';\nexport namespace PatchOperationsEntity {\n  export const Schema = {\n    items: PatchOperationEntity.Schema,\n    title: 'PatchOperations',\n    type: 'array'\n  } as const;\n  export type Type = readonly PatchOperationEntity.Type[];\n  export function validate(candidate: unknown): candidate is Type {\n    return Array.isArray(candidate);\n  }\n  export const intake = EntityCompiler.compileIntake<Type>(Schema);\n}";

const STRUCTURALLY_DERIVING_SCHEMA_REJECTED_SOURCE = "import { EntityCompiler } from '@studnicky/entity/node';\nexport namespace FooEntity {\n  export const Schema = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } as const;\n  export type Type = { id: string };\n  export function validate(candidate: unknown): candidate is Type {\n    return typeof (candidate as Record<string, unknown>).id === 'string';\n  }\n  export const intake = EntityCompiler.compileIntake<Type>(Schema);\n  export const create = EntityCompiler.compileCreate<Type>(Schema);\n}";

function verifyWith(rule: typeof entityFileShape, ruleName: string, code: string, filename: string, languageOptions: Linter.LanguageOptions): readonly string[] {
  const linter = new Linter();
  const messages = linter.verify(code, {
    files: ['**/*.ts'],
    languageOptions,
    plugins: { local: { rules: { [ruleName]: rule } } },
    rules: { [`local/${ruleName}`]: 'error' }
  }, { filename });

  return messages.map((message) => { return message.messageId ?? message.message; });
}

void describe('schema-derivation cross-rule agreement', () => {
  void it('entity-file-shape and type-alias-invariants both accept a Type composing another entity\'s already-justified .Type', () => {
    const entityFileShapeErrors = verifyWith(
      entityFileShape, 'entity-file-shape',
      COMPOSED_TYPE_ACCEPTED_SOURCE, 'src/entities/PatchOperationsEntity.ts', syntaxOnlyLanguageOptions
    );
    const typeAliasInvariantsErrors = verifyWith(
      typeAliasInvariants, 'type-alias-invariants',
      COMPOSED_TYPE_ACCEPTED_SOURCE, 'packages/eslint-config/PatchOperationsEntity.ts', typeAwareLanguageOptions
    );

    assert.deepEqual(entityFileShapeErrors, []);
    assert.deepEqual(typeAliasInvariantsErrors, []);
  });

  void it('entity-file-shape and type-alias-invariants both reject a hand-written Type when its own schema derives structurally', () => {
    const entityFileShapeErrors = verifyWith(
      entityFileShape, 'entity-file-shape',
      STRUCTURALLY_DERIVING_SCHEMA_REJECTED_SOURCE, 'src/entities/FooEntity.ts', syntaxOnlyLanguageOptions
    );
    const typeAliasInvariantsErrors = verifyWith(
      typeAliasInvariants, 'type-alias-invariants',
      STRUCTURALLY_DERIVING_SCHEMA_REJECTED_SOURCE, 'packages/eslint-config/FooEntity.ts', typeAwareLanguageOptions
    );

    assert.deepEqual(entityFileShapeErrors, ['typeNotFromSchema']);
    assert.deepEqual(typeAliasInvariantsErrors, ['derivedFromSchema']);
  });

  void it('all-types-are-entities does not flag the same justified hand-written Type as an ownership mismatch', () => {
    const errors = verifyWith(
      allTypesAreEntities, 'all-types-are-entities',
      COMPOSED_TYPE_ACCEPTED_SOURCE, 'packages/eslint-config/PatchOperationsEntity.ts', typeAwareLanguageOptions
    );

    assert.deepEqual(errors, []);
  });
});
