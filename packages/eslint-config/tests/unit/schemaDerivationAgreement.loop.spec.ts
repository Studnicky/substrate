import type { Rule } from 'eslint';

import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { allTypesAreEntities } from '../../src/rules/allTypesAreEntities.js';
import { entityFileShape } from '../../src/rules/entityFileShape.js';
import { typeAliasInvariants } from '../../src/rules/typeAliasInvariants.js';

// entity-file-shape, type-alias-invariants, and all-types-are-entities all consult
// SchemaMemberGuards.isJustifiedHandWrittenEntityType for the same declaration. This file
// asserts the SAME source against all three, so a future change to any one implementation
// that reintroduces disagreement fails here rather than surfacing as a cross-rule contradiction.

class SchemaAgreementRunners {
  public static readonly 'composedTypeAcceptedSource': string = "import { EntityCompiler } from '@studnicky/entity/node';\nimport { PatchOperationEntity } from './PatchOperationEntity.js';\nexport namespace PatchOperationsEntity {\n  export const Schema = {\n    items: PatchOperationEntity.Schema,\n    title: 'PatchOperations',\n    type: 'array'\n  } as const;\n  export type Type = readonly PatchOperationEntity.Type[];\n  export function validate(candidate: unknown): candidate is Type {\n    return Array.isArray(candidate);\n  }\n  export const intake = EntityCompiler.compileIntake<Type>(Schema);\n}";

  public static readonly 'structurallyDerivingSchemaRejectedSource': string = "import { EntityCompiler } from '@studnicky/entity/node';\nexport namespace FooEntity {\n  export const Schema = { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] } as const;\n  export type Type = { id: string };\n  export function validate(candidate: unknown): candidate is Type {\n    return typeof (candidate as Record<string, unknown>).id === 'string';\n  }\n  export const intake = EntityCompiler.compileIntake<Type>(Schema);\n  export const create = EntityCompiler.compileCreate<Type>(Schema);\n}";

  public static readonly 'syntaxOnlyLanguageOptions': Linter.LanguageOptions = {
    'parser': parser,
    'parserOptions': { 'ecmaVersion': 2022, 'sourceType': 'module' }
  };

  public static readonly 'typeAwareLanguageOptions': Linter.LanguageOptions = {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts', 'packages/eslint-config/*.ts', 'src/entities/*.ts'],
        'maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING': 30
      },
      'tsconfigRootDir': resolve(import.meta.dirname, '../../../..')
    }
  };

  public static verifyWith(rule: typeof entityFileShape, ruleName: string, code: string, filename: string, languageOptions: Linter.LanguageOptions): readonly string[] {
    const linter = new Linter();
    const plugin = { 'rules': SchemaAgreementRunners.rulePlugin(ruleName, rule) };
    const rules = SchemaAgreementRunners.ruleConfiguration(ruleName);
    const messages = linter.verify(code, {
      'files': ['**/*.ts'],
      'languageOptions': languageOptions,
      'plugins': { 'local': plugin },
      'rules': rules
    }, { 'filename': filename });
    const result = messages.map((message) => {
      const identifier = message.messageId ?? message.message;

      return identifier;
    });

    return result;
  }

  private static ruleConfiguration(ruleName: string): Record<string, Linter.RuleEntry> {
    const target: Record<string, Linter.RuleEntry> = {};
    const result = Object.defineProperty(target, `local/${ruleName}`, { 'enumerable': true, 'value': 'error' });

    return result;
  }

  private static rulePlugin(ruleName: string, rule: Rule.RuleModule): Record<string, Rule.RuleModule> {
    const target: Record<string, Rule.RuleModule> = {};
    const result = Object.defineProperty(target, ruleName, { 'enumerable': true, 'value': rule });

    return result;
  }
}

void describe('schema-derivation cross-rule agreement', () => {
  void it('entity-file-shape and type-alias-invariants both accept a Type composing another entity\'s already-justified .Type', () => {
    const entityFileShapeErrors = SchemaAgreementRunners.verifyWith(
      entityFileShape, 'entity-file-shape',
      SchemaAgreementRunners.composedTypeAcceptedSource, 'src/entities/PatchOperationsEntity.ts', SchemaAgreementRunners.syntaxOnlyLanguageOptions
    );
    const typeAliasInvariantsErrors = SchemaAgreementRunners.verifyWith(
      typeAliasInvariants, 'type-alias-invariants',
      SchemaAgreementRunners.composedTypeAcceptedSource, 'packages/eslint-config/PatchOperationsEntity.ts', SchemaAgreementRunners.typeAwareLanguageOptions
    );

    assert.deepEqual(entityFileShapeErrors, []);
    assert.deepEqual(typeAliasInvariantsErrors, []);
  });

  void it('entity-file-shape and type-alias-invariants both reject a hand-written Type when its own schema derives structurally', () => {
    const entityFileShapeErrors = SchemaAgreementRunners.verifyWith(
      entityFileShape, 'entity-file-shape',
      SchemaAgreementRunners.structurallyDerivingSchemaRejectedSource, 'src/entities/FooEntity.ts', SchemaAgreementRunners.syntaxOnlyLanguageOptions
    );
    const typeAliasInvariantsErrors = SchemaAgreementRunners.verifyWith(
      typeAliasInvariants, 'type-alias-invariants',
      SchemaAgreementRunners.structurallyDerivingSchemaRejectedSource, 'packages/eslint-config/FooEntity.ts', SchemaAgreementRunners.typeAwareLanguageOptions
    );

    assert.deepEqual(entityFileShapeErrors, ['typeNotFromSchema']);
    assert.deepEqual(typeAliasInvariantsErrors, ['derivedFromSchema']);
  });

  void it('all-types-are-entities does not flag the same justified hand-written Type as an ownership mismatch', () => {
    const errors = SchemaAgreementRunners.verifyWith(
      allTypesAreEntities, 'all-types-are-entities',
      SchemaAgreementRunners.composedTypeAcceptedSource, 'packages/eslint-config/PatchOperationsEntity.ts', SchemaAgreementRunners.typeAwareLanguageOptions
    );

    assert.deepEqual(errors, []);
  });
});
