import { readFileSync } from 'node:fs';
import { dirname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import assert from 'node:assert/strict';
import {
  afterEach, describe, it
} from 'node:test';
import {
  ModuleKind, ScriptTarget, preProcessFile, transpileModule
} from 'typescript';

import { ConfigurationError } from '../../../src/errors/index.js';
import { FetchTransport } from '../../../src/modules/browser/FetchTransport.js';
import { UndiciDispatcher as BrowserUndiciDispatcher } from '../../../src/modules/browser/UndiciDispatcher.js';

const BROWSER_ERROR_MESSAGE =
  'undici connection pooling requires a Node.js runtime; the browser uses native fetch';
const PACKAGE_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, '../..');
const originalFetch = globalThis.fetch;

const collectDocsBrowserSwaps = (): ReadonlyMap<string, string> => {
  const docsConfig = readFileSync(
    resolve(REPOSITORY_ROOT, 'docs/.vitepress/config.ts'),
    'utf8'
  );
  const declarationPattern =
    /\['(packages\/fetch\/src\/[^']+)', '(packages\/fetch\/src\/[^']+)'\]/gu;
  const swaps = new Map<string, string>();

  for (const declaration of docsConfig.matchAll(declarationPattern)) {
    const nodePath = declaration[1];
    const browserPath = declaration[2];

    if (nodePath === undefined || browserPath === undefined) {
      throw new TypeError('fetch browser swap declaration must contain source and browser paths');
    }

    swaps.set(
      resolve(REPOSITORY_ROOT, `${nodePath}.ts`),
      resolve(REPOSITORY_ROOT, `${browserPath}.ts`)
    );
  }

  return swaps;
};

const collectBrowserGraph = (
  entry: string,
  swaps: ReadonlyMap<string, string>
): ReadonlySet<string> => {
  const pending = [entry];
  const graph = new Set<string>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || graph.has(current)) {
      continue;
    }
    graph.add(current);

    const javascript = transpileModule(readFileSync(current, 'utf8'), {
      compilerOptions: {
        module: ModuleKind.ESNext,
        target: ScriptTarget.ES2022
      }
    }).outputText;
    const imports = preProcessFile(javascript).importedFiles;

    for (const importedFile of imports) {
      if (!importedFile.fileName.startsWith('.')) {
        graph.add(import.meta.resolve(importedFile.fileName));
        continue;
      }

      const resolvedImport = normalize(
        resolve(dirname(current), importedFile.fileName.replace(/\.js$/u, '.ts'))
      );
      pending.push(swaps.get(resolvedImport) ?? resolvedImport);
    }
  }

  return graph;
};

void afterEach(() => {
  globalThis.fetch = originalFetch;
});

void describe('browser fetch transport', () => {
  void it('keeps browser dispatcher construction behind create()', () => {
    assert.throws(
      () => { BrowserUndiciDispatcher.create({}); },
      (error: unknown): boolean => {
        return error instanceof ConfigurationError && error.message === BROWSER_ERROR_MESSAGE;
      }
    );
  });

  void it('uses native fetch when no dispatcher is supplied', async () => {
    const expectedResponse = new Response('browser response');
    let receivedUrl = '';
    let receivedInit: RequestInit | undefined;

    globalThis.fetch = async (input, init): Promise<Response> => {
      receivedUrl = String(input);
      receivedInit = init;
      return expectedResponse;
    };

    const response = await FetchTransport.fetch('https://example.com/resource', { method: 'GET' });

    assert.equal(response, expectedResponse);
    assert.equal(receivedUrl, 'https://example.com/resource');
    assert.deepEqual(receivedInit, { method: 'GET' });
  });

  void it('rejects Node dispatchers without calling native fetch', async () => {
    let fetchCalled = false;

    globalThis.fetch = async (): Promise<Response> => {
      fetchCalled = true;
      return new Response();
    };

    await assert.rejects(
      FetchTransport.fetch('https://example.com/resource', { dispatcher: {} }),
      (error: unknown): boolean => {
        return error instanceof ConfigurationError && error.message === BROWSER_ERROR_MESSAGE;
      }
    );
    assert.equal(fetchCalled, false);
  });

  void it('keeps undici out of the docs root-entry browser graph', () => {
    const swaps = collectDocsBrowserSwaps();
    const graph = collectBrowserGraph(resolve(PACKAGE_ROOT, 'src/index.ts'), swaps);

    assert.deepEqual(
      [...graph].filter((modulePath) => {
        return modulePath.startsWith('node:') || modulePath.includes('node_modules/undici');
      }),
      []
    );
    assert.ok(graph.has(resolve(PACKAGE_ROOT, 'src/config/browser/DispatcherAgent.ts')));
    assert.ok(graph.has(resolve(PACKAGE_ROOT, 'src/modules/browser/FetchTransport.ts')));
    assert.ok(graph.has(resolve(PACKAGE_ROOT, 'src/modules/browser/UndiciDispatcher.ts')));
  });
});
