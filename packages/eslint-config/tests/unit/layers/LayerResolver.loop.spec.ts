import { RuntimeError } from '@studnicky/errors/node';
import { Predicates } from '@studnicky/types/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { ProjectHostInterface } from '../../../src/interfaces/ProjectHostInterface.js';

import { NodeProjectHost } from '../../../src/node/NodeProjectHost.js';
import { LayerOptionsEntity } from '../../../src/rules/layers/LayerOptionsEntity.js';
import { LayerResolver } from '../../../src/rules/layers/LayerResolver.js';
import scenarioGroups from './LayerResolver.scenarios.json' with { 'type': 'json' };

class BrowserHost implements ProjectHostInterface {
  public findPackageRoot(_filename: string): string | undefined {
    return undefined;
  }

  public isBuiltinSpecifier(moduleSpecifier: string): boolean {
    const isBuiltin = moduleSpecifier === 'browser:storage';

    return isBuiltin;
  }

  public readTextFile(_filename: string): string | undefined {
    return undefined;
  }

  public realPath(_path: string): string | undefined {
    return undefined;
  }

  public resolveModule(_moduleSpecifier: string, _importerFilename: string): string | undefined {
    return undefined;
  }

  public resolveRelativePath(importerFilename: string, relativeSpecifier: string): string {
    try {
      const importer = new URL(importerFilename, 'https://project.test');
      const result = new URL(relativeSpecifier, importer).pathname;

      return result;
    } catch (cause) {
      throw RuntimeError.create(`Cannot resolve ${relativeSpecifier} from ${importerFilename}`, { 'cause': cause });
    }
  }
}

/** Validates one raw scenario fixture entry at the JSON-load edge; no caller re-derives this shape. */
class LayerResolverScenario {
  static readonly 'baseOptions': LayerOptionsEntity.Type = {
    'bindings': [
      { 'layer': 'domain', 'pattern': 'domain', 'unit': 'folder' },
      { 'layer': 'ports', 'pattern': 'ports', 'unit': 'folder' },
      { 'layer': 'application', 'pattern': 'application', 'unit': 'folder' },
      { 'layer': 'adapters', 'pattern': 'adapters', 'unit': 'folder' },
      { 'layer': 'infrastructure', 'pattern': 'infrastructure', 'unit': 'folder' },
      { 'layer': 'domain', 'pattern': '@domain/', 'unit': 'module' },
      { 'layer': 'ports', 'pattern': '@ports/', 'unit': 'module' }
    ],
    'layers': ['domain', 'ports', 'application', 'adapters', 'infrastructure'],
    'sourceRoot': 'src'
  };

  static readonly 'nodeHost': ProjectHostInterface = new NodeProjectHost();

  readonly 'from': string | undefined;

  readonly 'importingFile': string | undefined;

  readonly 'name': string;

  readonly 'operation': 'canImport' | 'layerForImport' | 'layerForPath';

  readonly 'options': LayerOptionsEntity.Type | undefined;

  readonly 'output': string | boolean | null | undefined;

  readonly 'path': string | undefined;

  readonly 'specifier': string | undefined;

  readonly 'to': string | undefined;

  constructor(raw: unknown) {
    const entry = LayerResolverScenario.requireRecord(raw, raw, 'entry');
    const input = LayerResolverScenario.requireRecord(entry.input, entry, 'entry');
    const expected = LayerResolverScenario.requireRecord(entry.expected, entry, 'entry');

    this.from = LayerResolverScenario.optionalString(input.from, input);
    this.importingFile = LayerResolverScenario.optionalString(input.importingFile, input);
    this.name = LayerResolverScenario.requireName(entry.name, entry);
    this.operation = LayerResolverScenario.requireOperation(entry.operation, entry);
    // `canImport` fixtures omit `bindings` because canImport never reads it; default it so intake's required-field check still runs.
    this.options = LayerResolverScenario.intakeOptions(input.options);
    this.output = LayerResolverScenario.intakeOutput(expected);
    this.path = LayerResolverScenario.optionalString(input.path, input);
    this.specifier = LayerResolverScenario.optionalString(input.specifier, input);
    this.to = LayerResolverScenario.optionalString(input.to, input);
  }

  run(): void {
    const options = this.options ?? LayerResolverScenario.baseOptions;

    switch (this.operation) {
      case 'canImport':
        this.runCanImport(options);
        break;
      case 'layerForImport':
        this.runLayerForImport(options);
        break;
      case 'layerForPath':
        this.runLayerForPath(options);
        break;
    }
  }

  private static describe(value: unknown): string {
    try {
      const description = JSON.stringify(value);

      return description;
    } catch (cause) {
      throw RuntimeError.create('Cannot serialize a LayerResolver scenario fragment', { 'cause': cause });
    }
  }

  private static intakeOptions(options: unknown): LayerOptionsEntity.Type | undefined {
    let intaken: LayerOptionsEntity.Type | undefined;

    if (options !== undefined) {
      intaken = LayerOptionsEntity.intake(Predicates.isObject(options) ? { 'bindings': [], ...options } : options);
    }

    return intaken;
  }

  private static intakeOutput(expected: Record<string, unknown>): string | boolean | null | undefined {
    const { output } = expected;

    if (output === null || output === undefined || typeof output === 'string' || typeof output === 'boolean') {
      return output;
    }
    throw RuntimeError.create(`malformed LayerResolver scenario expected.output: ${LayerResolverScenario.describe(expected)}`);
  }

  private static optionalString(value: unknown, context: unknown): string | undefined {
    if (value === undefined || typeof value === 'string') {
      return value;
    }
    throw RuntimeError.create(`malformed LayerResolver scenario input: ${LayerResolverScenario.describe(context)}`);
  }

  private static requireName(value: unknown, entry: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    throw RuntimeError.create(`malformed LayerResolver scenario entry: ${LayerResolverScenario.describe(entry)}`);
  }

  private static requireOperation(value: unknown, entry: unknown): 'canImport' | 'layerForImport' | 'layerForPath' {
    if (value === 'canImport' || value === 'layerForImport' || value === 'layerForPath') {
      return value;
    }
    throw RuntimeError.create(`malformed LayerResolver scenario entry: ${LayerResolverScenario.describe(entry)}`);
  }

  private static requireRecord(value: unknown, entry: unknown, label: string): Record<string, unknown> {
    if (Predicates.isObject(value)) {
      return value;
    }
    throw RuntimeError.create(`malformed LayerResolver scenario ${label}: ${LayerResolverScenario.describe(entry)}`);
  }

  private runCanImport(options: LayerOptionsEntity.Type): void {
    assert(this.from !== undefined, `canImport scenario '${this.name}' is missing input.from`);
    assert(this.to !== undefined, `canImport scenario '${this.name}' is missing input.to`);
    assert.strictEqual(LayerResolver.canImport(this.from, this.to, options), this.output);
  }

  private runLayerForImport(options: LayerOptionsEntity.Type): void {
    assert(this.specifier !== undefined, `layerForImport scenario '${this.name}' is missing input.specifier`);
    assert(this.importingFile !== undefined, `layerForImport scenario '${this.name}' is missing input.importingFile`);
    assert.strictEqual(
      LayerResolver.layerForImport(this.specifier, this.importingFile, options, LayerResolverScenario.nodeHost),
      this.output ?? undefined
    );
  }

  private runLayerForPath(options: LayerOptionsEntity.Type): void {
    assert(this.path !== undefined, `layerForPath scenario '${this.name}' is missing input.path`);
    assert.strictEqual(LayerResolver.layerForPath(this.path, options), this.output ?? undefined);
  }
}

void describe('LayerResolver', () => {
  void it('resolves browser host builtin and relative bindings through the configured host', () => {
    const options: LayerOptionsEntity.Type = {
      'bindings': [
        { 'layer': 'external', 'unit': 'builtin' },
        { 'layer': 'domain', 'pattern': 'domain', 'unit': 'folder' }
      ],
      'layers': ['domain', 'external'],
      'sourceRoot': 'src'
    };

    assert.equal(
      LayerResolver.layerForImport('browser:storage', '/repo/src/application/entry.ts', options, new BrowserHost()),
      'external'
    );
    assert.equal(
      LayerResolver.layerForImport('../domain/User.ts', '/repo/src/application/entry.ts', options, new BrowserHost()),
      'domain'
    );
  });

  void it('leaves host-dependent bindings unresolved when no project host is configured', () => {
    const options: LayerOptionsEntity.Type = {
      'bindings': [
        { 'layer': 'external', 'unit': 'builtin' },
        { 'layer': 'domain', 'pattern': 'domain', 'unit': 'folder' }
      ],
      'layers': ['domain', 'external'],
      'sourceRoot': 'src'
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

  for (let index = 0; index < scenarioGroups.cases.length; index += 1) {
    const rawCase: unknown = scenarioGroups.cases[index];
    if (rawCase !== undefined) {
      const scenario = new LayerResolverScenario(rawCase);
      void it(scenario.name, () => { scenario.run(); });
    }
  }
});
