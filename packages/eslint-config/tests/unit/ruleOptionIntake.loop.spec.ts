import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Linter } from 'eslint';
import type { Rule } from 'eslint';

import { adapterOnlyImport } from '../../src/rules/arch/adapterOnlyImport.js';
import { domainPurity } from '../../src/rules/arch/domainPurity.js';
import { intakeParseOnly } from '../../src/rules/arch/intakeParseOnly.js';
import { knownTypesOutsideAdapters } from '../../src/rules/arch/knownTypesOutsideAdapters.js';
import { layerImportBoundary } from '../../src/rules/arch/layerImportBoundary.js';
import { noThreadedVocabulary } from '../../src/rules/arch/noThreadedVocabulary.js';
import { LayerOptionsEntity } from '../../src/rules/layers/LayerOptionsEntity.js';
import { inlineTrivialLogic } from '../../src/rules/inlineTrivialLogic.js';
import { preferCollectionTypes } from '../../src/rules/preferCollectionTypes.js';
import { requireOptionsObject } from '../../src/rules/requireOptionsObject.js';
import { staticMethodVerbs } from '../../src/rules/staticMethodVerbs.js';

interface RuleOptionCase {
  readonly 'malformedOptions': Record<string, unknown>;
  readonly 'rule': Rule.RuleModule;
  readonly 'ruleName': string;
}

const languageOptions: Linter.LanguageOptions = { 'ecmaVersion': 2022, 'sourceType': 'module' };

const malformedOptionCases: readonly RuleOptionCase[] = [
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

const layerOptions: Record<string, unknown> = {
  'bindings': [
    { 'unit': 'folder', 'layer': 'domain', 'pattern': 'domain' },
    { 'unit': 'folder', 'layer': 'adapters', 'pattern': 'adapters' }
  ],
  'layers': ['domain', 'adapters'],
  'sourceRoot': 'src'
};

void describe('rule option intake', () => {
  for (const optionCase of malformedOptionCases) {
    void it(`surfaces malformed ${optionCase.ruleName} configuration`, () => {
      const linter = new Linter();
      assert.throws(() => {
        linter.verify(
          'const value = 1;',
          [{
            'files': ['**/*.ts'],
            'languageOptions': languageOptions,
            'plugins': { 'local': { 'rules': { [optionCase.ruleName]: optionCase.rule } } },
            'rules': { [`local/${optionCase.ruleName}`]: ['error', optionCase.malformedOptions] }
          }],
          { 'filename': 'source.ts' }
        );
      }, /Key "rules"/u);
    });
  }

  void it('keeps derived options out of the base intake and inside the derived rule intake', () => {
    const baseOptions = LayerOptionsEntity.intake({ ...layerOptions, 'adapterLayerName': 'domain' });
    assert.deepEqual(baseOptions, layerOptions);

    const linter = new Linter();
    const messages = linter.verify(
      "import axios from 'axios';",
      [{
        'files': ['**/*.ts'],
        'languageOptions': languageOptions,
        'plugins': { 'local': { 'rules': { 'adapter-only-import': adapterOnlyImport } } },
        'rules': {
          'local/adapter-only-import': ['error', {
            ...layerOptions,
            'adapterLayerName': 'domain',
            'adapterOnlyImports': ['axios']
          }]
        }
      }],
      { 'filename': 'src/adapters/HttpAdapter.ts' }
    );

    assert.deepEqual(messages.map((message) => { return message.ruleId; }), ['local/adapter-only-import']);
  });
});
