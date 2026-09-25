import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ProjectHostInterface } from '../../../src/interfaces/ProjectHostInterface.js';
import { NodeProjectHost } from '../../../src/node/NodeProjectHost.js';
import { LayerResolver } from '../../../src/rules/layers/LayerResolver.js';
import { LayerOptionsEntity } from '../../../src/rules/layers/LayerOptionsEntity.js';
import scenarioGroups from './LayerResolver.scenarios.json' with { type: 'json' };

const nodeHost = new NodeProjectHost();

const browserHost: ProjectHostInterface = {
  findPackageRoot(): string | undefined {
    return undefined;
  },
  isBuiltinSpecifier(moduleSpecifier: string): boolean {
    return moduleSpecifier === 'browser:storage';
  },
  readTextFile(): string | undefined {
    return undefined;
  },
  realPath(): string | undefined {
    return undefined;
  },
  resolveModule(): string | undefined {
    return undefined;
  },
  resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    const importer = new URL(importerFilename, 'https://project.test');
    const result = new URL(relativeSpecifier, importer).pathname;

    return result;
  }
};

const baseOptions: LayerOptionsEntity.Type = {
  bindings: [
    { unit: 'folder', pattern: 'domain', layer: 'domain' },
    { unit: 'folder', pattern: 'ports', layer: 'ports' },
    { unit: 'folder', pattern: 'application', layer: 'application' },
    { unit: 'folder', pattern: 'adapters', layer: 'adapters' },
    { unit: 'folder', pattern: 'infrastructure', layer: 'infrastructure' },
    { unit: 'module', pattern: '@domain/', layer: 'domain' },
    { unit: 'module', pattern: '@ports/', layer: 'ports' }
  ],
  layers: ['domain', 'ports', 'application', 'adapters', 'infrastructure'],
  sourceRoot: 'src'
};

type ScenarioCase = {
  expected: {
    output: string | boolean | null | undefined;
  };
  input: {
    from?: string;
    importingFile?: string;
    options?: LayerOptionsEntity.Type;
    path?: string;
    to?: string;
    specifier?: string;
  };
  name: string;
  operation: 'canImport' | 'layerForImport' | 'layerForPath';
};

const LAYER_OPERATIONS = ['canImport', 'layerForImport', 'layerForPath'] as const;

function isLayerOperation(value: unknown): value is ScenarioCase['operation'] {
  return typeof value === 'string' && (LAYER_OPERATIONS as readonly string[]).includes(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates one raw scenario fixture entry at the JSON-load edge; no caller re-derives this shape. */
function intakeScenarioCase(raw: unknown): ScenarioCase {
  if (!isPlainRecord(raw) || typeof raw.name !== 'string' || !isLayerOperation(raw.operation) || !isPlainRecord(raw.expected) || !isPlainRecord(raw.input)) {
    throw new TypeError(`malformed LayerResolver scenario entry: ${JSON.stringify(raw)}`);
  }
  const { expected, input } = raw;
  const output = expected.output;
  if (output !== null && output !== undefined && typeof output !== 'string' && typeof output !== 'boolean') {
    throw new TypeError(`malformed LayerResolver scenario expected.output: ${JSON.stringify(expected)}`);
  }
  if (!isOptionalString(input.from) || !isOptionalString(input.importingFile) || !isOptionalString(input.path) || !isOptionalString(input.specifier) || !isOptionalString(input.to)) {
    throw new TypeError(`malformed LayerResolver scenario input: ${JSON.stringify(input)}`);
  }
  return {
    'expected': { output },
    'input': {
      ...(input.from === undefined ? {} : { 'from': input.from }),
      ...(input.importingFile === undefined ? {} : { 'importingFile': input.importingFile }),
      // `canImport` fixtures omit `bindings` because canImport never reads it; default it so intake's required-field check still runs.
      ...(input.options === undefined ? {} : { 'options': LayerOptionsEntity.intake(isPlainRecord(input.options) ? { 'bindings': [], ...input.options } : input.options) }),
      ...(input.path === undefined ? {} : { 'path': input.path }),
      ...(input.specifier === undefined ? {} : { 'specifier': input.specifier }),
      ...(input.to === undefined ? {} : { 'to': input.to })
    },
    'name': raw.name,
    'operation': raw.operation
  };
}

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
        options,
        nodeHost
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
  void it('resolves browser host builtin and relative bindings through the configured host', () => {
    const options: LayerOptionsEntity.Type = {
      bindings: [
        { unit: 'builtin', layer: 'external' },
        { unit: 'folder', pattern: 'domain', layer: 'domain' }
      ],
      layers: ['domain', 'external'],
      sourceRoot: 'src'
    };

    assert.equal(
      LayerResolver.layerForImport('browser:storage', '/repo/src/application/entry.ts', options, browserHost),
      'external'
    );
    assert.equal(
      LayerResolver.layerForImport('../domain/User.ts', '/repo/src/application/entry.ts', options, browserHost),
      'domain'
    );
  });

  void it('leaves host-dependent bindings unresolved when no project host is configured', () => {
    const options: LayerOptionsEntity.Type = {
      bindings: [
        { unit: 'builtin', layer: 'external' },
        { unit: 'folder', pattern: 'domain', layer: 'domain' }
      ],
      layers: ['domain', 'external'],
      sourceRoot: 'src'
    };

    assert.equal(
      LayerResolver.layerForImport('browser:storage', '/repo/src/application/entry.ts', options, undefined),
      undefined
    );
    assert.equal(
      LayerResolver.layerForImport('../domain/User.ts', '/repo/src/application/entry.ts', options, undefined),
      undefined
    );
  });

  for (const scenario of (scenarioGroups.cases as unknown[]).map(intakeScenarioCase)) {
    void it(scenario.name, () => {
      operations[scenario.operation](scenario);
    });
  }
});
