import type { Rule } from 'eslint';

import { Linter } from 'eslint';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { adapterOnlyImport } from '../../src/rules/arch/adapterOnlyImport.js';
import { domainPurity } from '../../src/rules/arch/domainPurity.js';
import { intakeParseOnly } from '../../src/rules/arch/intakeParseOnly.js';
import { knownTypesOutsideAdapters } from '../../src/rules/arch/knownTypesOutsideAdapters.js';
import { layerImportBoundary } from '../../src/rules/arch/layerImportBoundary.js';
import { noThreadedVocabulary } from '../../src/rules/arch/noThreadedVocabulary.js';
import { inlineTrivialLogic } from '../../src/rules/inlineTrivialLogic.js';
import { LayerOptionsEntity } from '../../src/rules/layers/LayerOptionsEntity.js';
import { preferCollectionTypes } from '../../src/rules/preferCollectionTypes.js';
import { requireOptionsObject } from '../../src/rules/requireOptionsObject.js';
import { staticMethodVerbs } from '../../src/rules/staticMethodVerbs.js';

interface RuleOptionCaseInterface {
  readonly 'malformedOptions': Record<string, unknown>;
  readonly 'rule': Rule.RuleModule;
  readonly 'ruleName': string;
}

class RuleOptionIntakeRunners {
  private static readonly 'languageOptions': Linter.LanguageOptions = { 'ecmaVersion': 2022, 'sourceType': 'module' };

  private static readonly 'malformedOptionCases': readonly RuleOptionCaseInterface[] = [
    { 'malformedOptions': { 'checkArrayLiterals': 'yes' }, 'rule': preferCollectionTypes, 'ruleName': 'prefer-collection-types' },
    { 'malformedOptions': { 'minimumOptionals': 1 }, 'rule': requireOptionsObject, 'ruleName': 'require-options-object' },
    { 'malformedOptions': { 'allowLiterals': 'yes' }, 'rule': inlineTrivialLogic, 'ruleName': 'inline-trivial-logic' },
    { 'malformedOptions': { 'mode': 'unrecognised' }, 'rule': staticMethodVerbs, 'ruleName': 'static-method-verbs' },
    { 'malformedOptions': { 'sourceRoot': 1 }, 'rule': layerImportBoundary, 'ruleName': 'layer-import-boundary' },
    { 'malformedOptions': { 'exemptPackages': [1] }, 'rule': intakeParseOnly, 'ruleName': 'intake-parse-only' },
    { 'malformedOptions': { 'adapterOnlyImports': [1] }, 'rule': adapterOnlyImport, 'ruleName': 'adapter-only-import' },
    { 'malformedOptions': { 'domainLayerName': 1 }, 'rule': domainPurity, 'ruleName': 'domain-purity' },
    { 'malformedOptions': { 'adapterLayerName': 1 }, 'rule': knownTypesOutsideAdapters, 'ruleName': 'known-types-outside-adapters' },
    { 'malformedOptions': { 'resolutionSites': [1], 'sourceRoot': 'src' }, 'rule': noThreadedVocabulary, 'ruleName': 'no-threaded-vocabulary' }
  ];

  private static readonly 'layerOptions': Record<string, unknown> = {
    'bindings': [
      { 'layer': 'domain', 'pattern': 'domain', 'unit': 'folder' },
      { 'layer': 'adapters', 'pattern': 'adapters', 'unit': 'folder' }
    ],
    'layers': ['domain', 'adapters'],
    'sourceRoot': 'src'
  };

  public static declareMalformedCases(): void {
    for (let index = 0; index < RuleOptionIntakeRunners.malformedOptionCases.length; index += 1) {
      RuleOptionIntakeRunners.declareMalformedCase(RuleOptionIntakeRunners.malformedOptionCases[index]!);
    }
  }

  public static declareDerivedOptionsCase(): void {
    void it('rejects derived options at the base intake and accepts them at the derived rule intake', () => {
      assert.throws(() => {
        const intaken = LayerOptionsEntity.intake({ ...RuleOptionIntakeRunners.layerOptions, 'adapterLayerName': 'domain' });

        return intaken;
      });

      const linter = new Linter();
      const messages = linter.verify(
        "import axios from 'axios';",
        [{
          'files': ['**/*.ts'],
          'languageOptions': RuleOptionIntakeRunners.languageOptions,
          'plugins': { 'local': { 'rules': { 'adapter-only-import': adapterOnlyImport } } },
          'rules': {
            'local/adapter-only-import': ['error', {
              ...RuleOptionIntakeRunners.layerOptions,
              'adapterLayerName': 'domain',
              'adapterOnlyImports': ['axios']
            }]
          }
        }],
        { 'filename': 'src/adapters/HttpAdapter.ts' }
      );

      assert.deepEqual(messages.map((message) => { return message.ruleId; }), ['local/adapter-only-import']);
    });
  }

  private static declareMalformedCase(optionCase: RuleOptionCaseInterface): void {
    void it(`surfaces malformed ${optionCase.ruleName} configuration`, () => {
      RuleOptionIntakeRunners.verifyMalformedCase(optionCase);
    });
  }

  private static mentionsRulesKey(error: unknown): boolean {
    const result = typeof error === 'object' && error !== null && 'message' in error
      && typeof error.message === 'string' && error.message.includes('Key "rules"');

    return result;
  }

  private static ruleConfiguration(optionCase: RuleOptionCaseInterface): Record<string, Linter.RuleEntry> {
    const target: Record<string, Linter.RuleEntry> = {};
    const result = Object.defineProperty(target, `local/${optionCase.ruleName}`, { 'enumerable': true, 'value': ['error', optionCase.malformedOptions] });

    return result;
  }

  private static rulePlugin(optionCase: RuleOptionCaseInterface): Record<string, Rule.RuleModule> {
    const target: Record<string, Rule.RuleModule> = {};
    const result = Object.defineProperty(target, optionCase.ruleName, { 'enumerable': true, 'value': optionCase.rule });

    return result;
  }

  private static verifyMalformedCase(optionCase: RuleOptionCaseInterface): void {
    const linter = new Linter();
    const plugin = { 'rules': RuleOptionIntakeRunners.rulePlugin(optionCase) };
    const rules = RuleOptionIntakeRunners.ruleConfiguration(optionCase);

    assert.throws(() => {
      linter.verify(
        'const value = 1;',
        [{
          'files': ['**/*.ts'],
          'languageOptions': RuleOptionIntakeRunners.languageOptions,
          'plugins': { 'local': plugin },
          'rules': rules
        }],
        { 'filename': 'source.ts' }
      );
    }, RuleOptionIntakeRunners.mentionsRulesKey);
  }
}

void describe('rule option intake', () => {
  RuleOptionIntakeRunners.declareMalformedCases();
  RuleOptionIntakeRunners.declareDerivedOptionsCase();
});
