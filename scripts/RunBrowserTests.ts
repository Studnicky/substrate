#!/usr/bin/env node
import type { Browser } from 'playwright';

/**
 * Runs the browser-condition spec files in real browser engines (Chromium,
 * Firefox, WebKit) via Playwright, instead of Node simulating a browser
 * through `--conditions=browser`. Each spec file imports `describe`/`it`/
 * `mock` from `node:test` and `assert` from `node:assert/strict` — Node
 * builtins with no browser equivalent — so each file is bundled with esbuild,
 * aliasing those two specifiers to `scripts/test-helpers/browser-test-kit`,
 * before being served to a real browser page over a local HTTP server (a
 * real browser's module-script loader rejects `file://`).
 *
 * Only spec files that actually exercise a `/browser` entrypoint's own
 * platform-divergent behavior, and bundle cleanly for a real browser target,
 * are listed here. A spec file stays on the ordinary `--conditions=browser`
 * Node path in `scripts/test-suite.ts` instead when it is Node-only by
 * nature (process-level sandboxing, Node-only introspection, static
 * import-path parity) or when it cross-imports the real Node implementation
 * alongside the browser one for same-file comparison — bundling such a file
 * for a browser target fails at the import graph, not at runtime.
 *
 * `fetch`'s browser-condition tests are split across two files for exactly
 * this reason. `FetchTransportContract.loop.spec.ts` holds the plain
 * `BrowserFetchClient` contract tests — no Node import anywhere in its
 * graph — and runs here, in real browsers. `FetchTransport.loop.spec.ts`
 * keeps the `ScenarioSuite`-driven table tests: `ScenarioSuite` is a shared
 * test-registration utility whose own module graph (`ScenarioFileCompiler` →
 * `NodeSchemaAgreement`) genuinely needs `node:fs`/`node:os`/`node:path`/
 * `node:util` for an unrelated conformance feature, not anything specific to
 * this spec, so it stays on the ordinary `--conditions=browser` Node path.
 *
 * `virtual-fs`'s `AsyncFileSystem` spec stays there for a different reason:
 * it directly constructs the real `NodeFileSystem` for a same-file contract
 * comparison against `OpfsFileSystem` — a genuine, deliberate side-by-side
 * test with no shared-helper indirection to swap out.
 */
import * as esbuild from 'esbuild';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { imports as resolvePackageImports } from 'resolve.exports';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER_TEST_KIT_DIR = resolve(ROOT_DIR, 'scripts/test-helpers/browser-test-kit');

const BROWSER_SPEC_FILES: readonly string[] = [
  'packages/concurrency/tests/unit/file-lock/browser/NodeOwnerToken.loop.spec.ts',
  'packages/concurrency/tests/unit/file-lock/browser/WebLock.loop.spec.ts',
  'packages/context/tests/unit/browser/ContextBrowserSemantics.loop.spec.ts',
  'packages/entity/tests/unit/entity-compiler-browser/entity-compiler-browser-csp.loop.spec.ts',
  'packages/fetch/tests/unit/browser/FetchTransportContract.loop.spec.ts',
  'packages/system/tests/unit/browser/System.loop.spec.ts'
];

interface RealBrowserEngineInterface {
  readonly 'launch': () => Promise<Browser>;
  readonly 'name': string;
}

const REAL_BROWSER_ENGINES: readonly RealBrowserEngineInterface[] = [
  { 'launch': () => { return chromium.launch(); }, 'name': 'chromium' },
  { 'launch': () => { return firefox.launch(); }, 'name': 'firefox' },
  { 'launch': () => { return webkit.launch(); }, 'name': 'webkit' }
];

/** Resolves a relative `.js` specifier against a source tree that only has `.ts` files on disk. */
const tsExtensionFallbackPlugin: esbuild.Plugin = {
  'name': 'ts-extension-fallback',
  'setup': (build) => {
    build.onResolve({ 'filter': /\.js$/ }, async (args) => {
      const isRelativeImport = args.kind === 'import-statement' || args.kind === 'dynamic-import';
      if (isRelativeImport === false) {
        return undefined;
      }
      const tsSpecifier = `${args.path.slice(0, -'.js'.length)}.ts`;
      const result = await build.resolve(tsSpecifier, {
        'importer': args.importer,
        'kind': args.kind,
        'resolveDir': args.resolveDir
      });
      if (result.errors.length > 0) {
        return undefined;
      }
      return { 'path': result.path };
    });
  }
};

function findNearestPackageJson(startDirectory: string): string | null {
  let currentDirectory = startDirectory;
  while (true) {
    const candidate = join(currentDirectory, 'package.json');
    const candidateExists = existsSync(candidate);
    if (candidateExists) {
      return candidate;
    }
    const parentDirectory = dirname(currentDirectory);
    if (parentDirectory === currentDirectory) {
      return null;
    }
    currentDirectory = parentDirectory;
  }
}

/**
 * Resolves a package-internal `#specifier` subpath import with the `browser`
 * condition forced, via `resolve.exports`'s `imports()` — the same Node
 * resolution algorithm `exports`-field resolution uses, including wildcard
 * patterns and array fallbacks. esbuild's own `conditions` option does not
 * reach `imports`-field resolution the way it reaches `exports`-field
 * resolution, so every `#runtime`/`#provider`/`#file-system` import resolves
 * to the `node` variant regardless of `conditions` or `platform` unless this
 * plugin resolves it first.
 */
const subpathImportsBrowserPlugin: esbuild.Plugin = {
  'name': 'subpath-imports-browser',
  'setup': (build) => {
    build.onResolve({ 'filter': /^#/ }, (args) => {
      const packageJsonPath = findNearestPackageJson(args.resolveDir);
      if (packageJsonPath === null) {
        return undefined;
      }
      const packageJson: unknown = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const [target] = resolvePackageImports(packageJson, args.path, { 'browser': true }) ?? [];
      if (target === undefined) {
        return undefined;
      }
      return { 'path': resolve(dirname(packageJsonPath), target) };
    });
  }
};

/** Imports the spec file for its `describe`/`it` registration side effects, then runs and exposes the summary as a real global — a bundled spec file's own top-level bindings stay module-scoped, so the harness page needs this bridge to read `runRegisteredTests`. */
function buildVirtualEntrySource(specFile: string): string {
  const entryPoint = resolve(ROOT_DIR, specFile);
  return `import ${JSON.stringify(entryPoint)};
import { runRegisteredTests } from ${JSON.stringify(resolve(BROWSER_TEST_KIT_DIR, 'BrowserTestRunner.ts'))};
const summary = await runRegisteredTests();
globalThis.substrateBrowserTestSummary = {
  passed: summary.passed,
  total: summary.total,
  failures: summary.failures.map((failure) => ({
    name: failure.name,
    message: failure.error instanceof Error ? failure.error.message : String(failure.error)
  }))
};
`;
}

async function bundleSpecFile(specFile: string): Promise<string> {
  // `ignoreAnnotations: true`: every spec package declares `"sideEffects": false`
  // for production tree-shaking, but this harness's entry point imports the
  // spec file purely for its `describe`/`it` registration side effects — the
  // same annotation that is correct for library consumers would make esbuild
  // drop that import here, silently running zero tests.
  const result = await esbuild.build({
    'alias': {
      'node:assert/strict': resolve(BROWSER_TEST_KIT_DIR, 'BrowserAssertStrict.ts'),
      'node:test': resolve(BROWSER_TEST_KIT_DIR, 'BrowserTestRunner.ts')
    },
    'bundle': true,
    'conditions': ['browser'],
    'format': 'esm',
    'ignoreAnnotations': true,
    'platform': 'browser',
    'plugins': [subpathImportsBrowserPlugin, tsExtensionFallbackPlugin],
    'stdin': {
      'contents': buildVirtualEntrySource(specFile),
      'loader': 'ts',
      'resolveDir': ROOT_DIR,
      'sourcefile': 'virtual-entry.ts'
    },
    'target': 'es2022',
    'write': false
  });
  const [output] = result.outputFiles;
  if (output === undefined) {
    throw new Error(`RunBrowserTests: esbuild produced no output for ${specFile}`);
  }
  return output.text;
}

function buildHarnessPage(bundleSource: string): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script type="module">
${bundleSource}
</script>
</body>
</html>`;
}

interface BrowserTestFailureSummaryInterface {
  readonly 'message': string;
  readonly 'name': string;
}

interface SpecResultInterface {
  readonly 'engine': string;
  readonly 'failures': readonly BrowserTestFailureSummaryInterface[];
  readonly 'specFile': string;
  readonly 'summary': { readonly 'passed': number; readonly 'total': number } | null;
}

interface BrowserTestSummaryWindowInterface {
  readonly 'substrateBrowserTestSummary'?: {
    readonly 'failures': readonly BrowserTestFailureSummaryInterface[];
    readonly 'passed': number;
    readonly 'total': number;
  };
}

/** Serves one harness page over a fresh local HTTP server, runs it in one real browser engine, and reports the outcome. */
async function runSpecInEngine(engine: RealBrowserEngineInterface, specFile: string, html: string): Promise<SpecResultInterface> {
  const server = createServer((_request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(html);
  });
  await new Promise<void>((settle) => { server.listen(0, '127.0.0.1', settle); });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('RunBrowserTests: failed to bind local server');
  }
  const serverUrl = `http://127.0.0.1:${address.port}`;

  const browser = await engine.launch();
  try {
    const page = await browser.newPage();
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => { pageErrors.push(error.message); });

    await page.goto(serverUrl);
    await page.waitForFunction(() => {
      return (globalThis as unknown as BrowserTestSummaryWindowInterface).substrateBrowserTestSummary !== undefined;
    }, { 'timeout': 30_000 });

    if (pageErrors.length > 0) {
      return {
        'engine': engine.name,
        'failures': pageErrors.map((message) => { return { 'message': message, 'name': '(uncaught page error)' }; }),
        'specFile': specFile,
        'summary': null
      };
    }

    const summary = await page.evaluate(() => {
      return (globalThis as unknown as Required<BrowserTestSummaryWindowInterface>).substrateBrowserTestSummary;
    });

    return { 'engine': engine.name, 'failures': summary.failures, 'specFile': specFile, 'summary': { 'passed': summary.passed, 'total': summary.total } };
  } finally {
    await browser.close();
    server.close();
  }
}

async function main(): Promise<void> {
  const results: SpecResultInterface[] = [];

  for (const specFile of BROWSER_SPEC_FILES) {
    console.log(`RunBrowserTests: bundling ${specFile}`);
    const bundleSource = await bundleSpecFile(specFile);
    const html = buildHarnessPage(bundleSource);

    for (const engine of REAL_BROWSER_ENGINES) {
      console.log(`RunBrowserTests: running ${specFile} in ${engine.name}`);
      const result = await runSpecInEngine(engine, specFile, html);
      results.push(result);
      const status = result.failures.length === 0 ? 'PASS' : 'FAIL';
      const counts = result.summary !== null ? `${result.summary.passed}/${result.summary.total}` : 'crashed';
      console.log(`RunBrowserTests: ${status} ${specFile} [${engine.name}] ${counts}`);
    }
  }

  const failed = results.filter((result) => { return result.failures.length > 0; });
  const hasFailures = failed.length > 0;
  if (hasFailures) {
    console.error('\nRunBrowserTests: failures:');
    for (const result of failed) {
      console.error(`  ${result.specFile} [${result.engine}]`);
      for (const failure of result.failures) {
        console.error(`    - ${failure.name}: ${failure.message}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(`\nRunBrowserTests: OK (${results.length} spec/engine combinations passed)`);
}

await main();
