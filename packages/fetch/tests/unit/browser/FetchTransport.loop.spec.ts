import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  afterEach, describe, it
} from 'node:test';

import { DispatcherAgent as BrowserDispatcherAgent } from '../../../src/config/browser/DispatcherAgent.js';
import { ConfigurationError } from '../../../src/errors/index.js';
import { FetchTransport } from '../../../src/modules/browser/FetchTransport.js';
import { UndiciDispatcher as BrowserUndiciDispatcher } from '../../../src/modules/browser/UndiciDispatcher.js';
import packageManifest from '../../../package.json' with { type: 'json' };
import scenarioGroups from './FetchTransport.scenarios.json' with { type: 'json' };

type ScenarioCase =
  | { description: string; expected: { message: string }; input: Record<string, never>; name: string; operation: 'browser-dispatcher-create' }
  | { description: string; expected: { message: string }; input: Record<string, never>; name: string; operation: 'browser-agent-create' }
  | { description: string; expected: { input: string; init: Record<string, unknown> }; input: Record<string, never>; name: string; operation: 'uses-native-fetch' }
  | { description: string; expected: { message: string }; input: Record<string, never>; name: string; operation: 'rejects-node-dispatcher' }
  | { description: string; expected: { message: string }; input: Record<string, never>; name: string; operation: 'browser-dispatcher-methods' }
  | { description: string; expected: { mappings: readonly { from: string; to: string }[] }; input: Record<string, never>; name: string; operation: 'package-browser-map' };

const originalFetch = globalThis.fetch;

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

function sourceModuleUrl(qualifiedPath: string): string {
  const sourcePath = qualifiedPath.replace(/^packages\/fetch\//, '');
  return new URL(`../../../${sourcePath}.js`, import.meta.url).href;
}

function sourceFilePath(qualifiedPath: string): string {
  const sourcePath = qualifiedPath.replace(/^packages\/fetch\//, '');
  return fileURLToPath(new URL(`../../../${sourcePath}.ts`, import.meta.url));
}

/**
 * Converts a `package.json#browser` dist path (e.g. `./dist/modules/FetchTransport.js`)
 * into the qualified source path the scenario mappings use (e.g.
 * `packages/fetch/src/modules/FetchTransport`), so the compiled bundler map can be
 * compared directly against the source-tree shape asserted by the scenario.
 */
function toQualifiedSourcePath(distPath: string): string {
  return distPath.replace(/^\.\/dist\//, 'packages/fetch/src/').replace(/\.js$/, '');
}

/** The actual browser-resolution graph bundlers apply, read from `package.json#browser`. */
function actualBrowserMappings(): { from: string; to: string }[] {
  const browserField = (packageManifest as { browser?: Record<string, string> }).browser ?? {};
  return Object.entries(browserField).map(([from, to]) => {
    return { from: toQualifiedSourcePath(from), to: toQualifiedSourcePath(to) };
  });
}

async function runCase(scenarioCase: ScenarioCase): Promise<void> {
  if (scenarioCase.operation === 'browser-dispatcher-create') {
    assert.equal(scenarioCase.input.message, scenarioCase.expected.message);
    assert.throws(
      () => { BrowserUndiciDispatcher.create({}); },
      (error): boolean => {
        return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
      }
    );
    return;
  }

  if (scenarioCase.operation === 'browser-agent-create') {
    assert.equal(scenarioCase.input.message, scenarioCase.expected.message);
    assert.throws(
      () => { BrowserDispatcherAgent.create({} as never); },
      (error): boolean => {
        return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
      }
    );
    return;
  }

  if (scenarioCase.operation === 'uses-native-fetch') {
    assert.equal(scenarioCase.input.input, scenarioCase.expected.input);
    assert.deepEqual(scenarioCase.input.init, scenarioCase.expected.init);
    const expectedResponse = new Response('browser response');
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;

    globalThis.fetch = async (input, init): Promise<Response> => {
      receivedUrl = String(input);
      receivedInit = init;
      return expectedResponse;
    };

    return FetchTransport.fetch(scenarioCase.expected.input, { method: 'GET' }).then((response) => {
      assert.equal(response, expectedResponse);
      assert.equal(receivedUrl, scenarioCase.expected.input);
      assert.deepEqual(receivedInit, scenarioCase.expected.init);
    });
  }

  if (scenarioCase.operation === 'rejects-node-dispatcher') {
    assert.equal(scenarioCase.input.message, scenarioCase.expected.message);
    let fetchCalled = false;

    globalThis.fetch = async (): Promise<Response> => {
      fetchCalled = true;
      return new Response();
    };

    return assert.rejects(
      FetchTransport.fetch('https://example.com/resource', { dispatcher: {} }),
      (error): boolean => {
        return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
      }
    ).then(() => {
      assert.equal(fetchCalled, false);
    });
  }

  if (scenarioCase.operation === 'browser-dispatcher-methods') {
    const browserDispatcher = Object.create(BrowserUndiciDispatcher.prototype) as ReturnType<typeof BrowserUndiciDispatcher.create>;

    assert.throws(() => {
      browserDispatcher.checkDispatcherHealth('https://example.com');
    }, (error): boolean => {
      return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
    });

    assert.throws(() => {
      browserDispatcher.close();
    }, (error): boolean => {
      return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
    });

    assert.throws(() => {
      browserDispatcher.destroy();
    }, (error): boolean => {
      return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
    });

    assert.throws(() => {
      browserDispatcher.getStats();
    }, (error): boolean => {
      return error instanceof ConfigurationError && error.message === scenarioCase.expected.message;
    });
    return;
  }

  const actualMappings = actualBrowserMappings();

  assert.equal(actualMappings.length, scenarioCase.expected.mappings.length);
  assert.deepEqual(actualMappings, scenarioCase.expected.mappings);

  for (const mapping of actualMappings) {
    assert.ok(mapping.from.startsWith('packages/fetch/src/'));
    assert.ok(mapping.to.startsWith('packages/fetch/src/'));
    const source = readFileSync(sourceFilePath(mapping.to), 'utf8');
    assert.ok(!/from ['"]undici['"]/.test(source), `${mapping.to} must not import undici directly`);
    await import(sourceModuleUrl(mapping.to));
  }
}

void describe('browser fetch transport', () => {
  for (const scenario of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenario.name, async () => {
      await runCase(scenario);
    });
  }
});
