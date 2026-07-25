import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { LayerResolver } from '../../../src/rules/layers/LayerResolver.js';
import type { LayerOptionsEntity } from '../../../src/rules/layers/LayerOptionsEntity.js';
import scenarioGroups from './LayerResolver.scenarios.json';

const baseOptions: LayerOptionsEntity.Type = {
  aliasPrefixes: { '@domain/': 'domain', '@ports/': 'ports' },
  layers: ['domain', 'ports', 'application', 'adapters', 'infrastructure'],
  sourceRoot: 'src'
};

type ScenarioCase = {
  importingFile?: string;
  input: {
    from?: string;
    importingFile?: string;
    operation: 'canImport' | 'layerForImport' | 'layerForPath';
    options?: LayerOptionsEntity.Type;
    path?: string;
    to?: string;
    specifier?: string;
  };
  expected: {
    output: string | boolean | null | undefined;
  };
  name: string;
  operation: 'canImport' | 'layerForImport' | 'layerForPath';
};

const operations: Record<ScenarioCase['operation'], (scenario: ScenarioCase) => void> = {
  'canImport': (scenario) => {
    const options = scenario.input.options ?? baseOptions;
    assert.strictEqual(
      LayerResolver.canImport(
        scenario.input.from as string,
        scenario.input.to as string,
        options
      ),
      scenario.expected.output
    );
  },
  'layerForImport': (scenario) => {
    const options = scenario.input.options ?? baseOptions;
    assert.strictEqual(
      LayerResolver.layerForImport(
        scenario.input.specifier as string,
        scenario.input.importingFile as string,
        options
      ),
      scenario.expected.output ?? undefined
    );
  },
  'layerForPath': (scenario) => {
    const options = scenario.input.options ?? baseOptions;
    assert.strictEqual(
      LayerResolver.layerForPath(scenario.input.path as string, options),
      scenario.expected.output ?? undefined
    );
  }
};

void describe('LayerResolver', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, () => {
      operations[scenario.operation](scenario);
    });
  }
});
