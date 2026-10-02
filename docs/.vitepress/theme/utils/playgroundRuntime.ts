// In-browser module loader for runnable examples.
//
// An example is a real .ts file in packages/*/examples/. To execute its (possibly
// edited) source in the browser we must resolve its imports. Imports fall into
// two worlds:
//
//   1. Package sources — imported on demand from a lazy glob before execution.
//   2. Example-tree modules — loaded lazily from their raw source via a tiny
//      CommonJS evaluator, memoized so only modules an example actually imports
//      are evaluated, and side-effectful module bodies run at most once.
//
// `runExample` transpiles the example's editor text with the TypeScript compiler
// (loaded on first Execute) and executes it with a `require` shim bound to the
// example's path.

/// <reference types="vite/client" />

import type * as TypeScriptNamespace from 'typescript';

import { ExampleSources } from './ExampleSources';
import { isDeepStrictEqual } from './NodeUtilShim';

interface SourceModuleLoaderInterface {
  (): Promise<Record<string, unknown>>;
}

// Lazy glob of every browser-safe package source module. Vite compiles a module only
// when an example imports it. Keys are relative to this file, e.g.:
//   '../../../../packages/retry/src/browser/index.ts'
//
// Modules bound to Node built-ins (`node:test`, `node:worker_threads`, async_hooks, fs, the
// eslint host) are excluded; a `node` entrypoint that is excluded resolves to its `browser`
// counterpart (see `resolveSourceCanonical`). Entities, interfaces, and types are
// runtime-neutral.
const SOURCE_GLOB = import.meta.glob<Record<string, unknown>>(
  [
    '../../../../packages/*/src/**/*.ts',
    '!../../../../packages/*/src/**/*.d.ts',
    '!../../../../packages/context/src/index.ts',
    '!../../../../packages/context/src/node/**',
    '!../../../../packages/eslint-config/src/node/**',
    '!../../../../packages/virtual-fs/src/node/**',
    '!../../../../packages/eslint-config/src/index.ts',
    '!../../../../packages/example-smoke-kit/src/index.ts',
    '!../../../../packages/example-smoke-kit/src/ExampleSmokeRunner.ts',
    '!../../../../packages/worker-pool/src/WorkerPool.ts',
    '!../../../../packages/worker-pool/src/node/**',
    '!../../../../packages/scenario-kit/src/node/**'
  ]
);

interface PackageManifestInterface {
  'exports'?: Record<string, { 'import'?: string }>;
  'name': string;
}

// Each package's `package.json` "exports" map is the authority for subpath specifiers.
const PACKAGE_MANIFESTS = import.meta.glob<PackageManifestInterface>(
  '../../../../packages/*/package.json',
  { 'eager': true, 'import': 'default' }
);

const SOURCE_LOADERS: Record<string, SourceModuleLoaderInterface> = {};
const STATIC_MODULES: Record<string, unknown> = buildStaticModules();
const PENDING_MODULES = new Map<string, Promise<Record<string, unknown>>>();

for (const [key, loader] of Object.entries(SOURCE_GLOB)) {
  const canonical = key.replace(/^(?:\.\.\/)+/u, '').replace(/\.ts$/u, '');
  SOURCE_LOADERS[canonical] = loader;
}

// Specifier ("@studnicky/store/strata/browser") -> canonical source path
// ("packages/store/src/strata/browser/index"), derived from the exports maps. A `./node`
// subpath resolves to its declared `./browser` sibling: the playground is a browser.
const EXPORT_TARGETS = buildExportTargets();

function buildExportTargets(): Map<string, string> {
  const targets = new Map<string, string>();

  for (const [manifestKey, manifest] of Object.entries(PACKAGE_MANIFESTS)) {
    const directory = manifestKey.replace(/^(?:\.\.\/)+/u, '').replace(/\/package\.json$/u, '');

    for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
      const built = target.import;
      if (typeof built === 'string') {
        const canonical = built.replace(/^\.\/dist\//u, `${directory}/src/`).replace(/\.js$/u, '');
        targets.set(`${manifest.name}${subpath.slice(1)}`, canonical);
      }
    }
  }

  for (const specifier of targets.keys()) {
    const browserTarget = targets.get(specifier.replace(/\/node$/u, '/browser'));
    if (specifier.endsWith('/node') && typeof browserTarget === 'string') {
      targets.set(specifier, browserTarget);
    }
  }

  return targets;
}

interface TimerOptionsInterface {
  'signal'?: AbortSignal;
}

function makeTimersShim(): Record<string, unknown> {
  return {
    'setTimeout': (ms: number, value?: unknown, opts?: TimerOptionsInterface): Promise<unknown> => {
      return new Promise<unknown>((resolve, reject) => {
        if (opts?.signal?.aborted === true) {
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }
        const id = globalThis.setTimeout(() => { resolve(value); }, ms);
        opts?.signal?.addEventListener('abort', () => {
          globalThis.clearTimeout(id);
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    }
  };
}

function describeValue(value: unknown): string {
  try {
    return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
  } catch {
    return String(value);
  }
}

function failure(message: string | Error | undefined, fallback: string): Error {
  return message instanceof Error ? message : new Error(message ?? fallback);
}

function matchesExpectation(error: unknown, expected: unknown): boolean {
  if (expected === undefined) {
    return true;
  }
  if (expected instanceof RegExp) {
    return expected.test(String(error));
  }
  if (typeof expected === 'function') {
    if (expected.prototype !== undefined && error instanceof expected) {
      return true;
    }
    return (expected === Error || expected.prototype instanceof Error) === false && Reflect.apply(expected, undefined, [error]) === true;
  }
  if (typeof expected === 'object' && expected !== null) {
    return Object.entries(expected).every(([key, value]) => {
      const actual: unknown = Reflect.get(Object(error), key);
      return value instanceof RegExp && typeof actual === 'string' ? value.test(actual) : isDeepStrictEqual(actual, value);
    });
  }
  return true;
}

function assert(value: unknown, message?: string | Error): void {
  const passed = Boolean(value);
  if (passed) {
    return;
  }
  throw failure(message, 'Assertion failed');
}

interface AssertShimInterface {
  (value: unknown, message?: string | Error): void;
  'deepEqual': (a: unknown, b: unknown, message?: string | Error) => void;
  'deepStrictEqual': (a: unknown, b: unknown, message?: string | Error) => void;
  'doesNotMatch': (value: string, pattern: RegExp, message?: string | Error) => void;
  'doesNotReject': (input: (() => Promise<unknown>) | Promise<unknown>) => Promise<void>;
  'doesNotThrow': (fn: () => unknown) => void;
  'equal': (a: unknown, b: unknown, message?: string | Error) => void;
  'fail': (message?: string | Error) => never;
  'ifError': (value: unknown) => void;
  'match': (value: string, pattern: RegExp, message?: string | Error) => void;
  'notDeepEqual': (a: unknown, b: unknown, message?: string | Error) => void;
  'notDeepStrictEqual': (a: unknown, b: unknown, message?: string | Error) => void;
  'notEqual': (a: unknown, b: unknown, message?: string | Error) => void;
  'notStrictEqual': (a: unknown, b: unknown, message?: string | Error) => void;
  'ok': (value: unknown, message?: string | Error) => void;
  'rejects': (input: (() => Promise<unknown>) | Promise<unknown>, expected?: unknown, message?: string | Error) => Promise<void>;
  'strictEqual': (a: unknown, b: unknown, message?: string | Error) => void;
  'throws': (fn: () => unknown, expected?: unknown, message?: string | Error) => void;
}

async function settle(input: (() => Promise<unknown>) | Promise<unknown>): Promise<unknown> {
  try {
    await (typeof input === 'function' ? input() : input);
  } catch (error: unknown) {
    return error;
  }
  return undefined;
}

function equal(a: unknown, b: unknown, message?: string | Error): void {
  if (Object.is(a, b) === false) {
    throw failure(message, `Expected values to be strictly equal:\n  ${describeValue(a)}\n  ${describeValue(b)}`);
  }
}

function notEqual(a: unknown, b: unknown, message?: string | Error): void {
  if (Object.is(a, b)) {
    throw failure(message, `Expected "actual" to be strictly unequal to: ${describeValue(b)}`);
  }
}

function deepEqual(a: unknown, b: unknown, message?: string | Error): void {
  if (isDeepStrictEqual(a, b) === false) {
    throw failure(message, `Expected values to be strictly deep-equal:\n  ${describeValue(a)}\n  ${describeValue(b)}`);
  }
}

function notDeepEqual(a: unknown, b: unknown, message?: string | Error): void {
  if (isDeepStrictEqual(a, b)) {
    throw failure(message, `Expected "actual" not to be strictly deep-equal to: ${describeValue(b)}`);
  }
}

function throws(fn: () => unknown, expected?: unknown, message?: string | Error): void {
  let thrown: unknown;
  let didThrow = false;
  try {
    fn();
  } catch (error: unknown) {
    thrown = error;
    didThrow = true;
  }
  if (didThrow === false) {
    throw failure(typeof expected === 'string' ? expected : message, 'Missing expected exception.');
  }
  if (matchesExpectation(thrown, typeof expected === 'string' ? undefined : expected) === false) {
    throw failure(message, `The thrown error does not satisfy the expectation: ${describeValue(thrown)}`);
  }
}

async function rejects(input: (() => Promise<unknown>) | Promise<unknown>, expected?: unknown, message?: string | Error): Promise<void> {
  const rejection = await settle(input);
  if (rejection === undefined) {
    throw failure(typeof expected === 'string' ? expected : message, 'Missing expected rejection.');
  }
  if (matchesExpectation(rejection, typeof expected === 'string' ? undefined : expected) === false) {
    throw failure(message, `The rejection does not satisfy the expectation: ${describeValue(rejection)}`);
  }
}

function assertMatch(value: string, pattern: RegExp, message?: string | Error): void {
  if (pattern.test(value) === false) {
    throw failure(message, `The input did not match the regular expression ${String(pattern)}: ${describeValue(value)}`);
  }
}

function doesNotMatch(value: string, pattern: RegExp, message?: string | Error): void {
  if (pattern.test(value)) {
    throw failure(message, `The input was expected to not match ${String(pattern)}: ${describeValue(value)}`);
  }
}

function makeAssertShim(): AssertShimInterface {
  return Object.assign((value: unknown, message?: string | Error): void => { assert(value, message); }, {
    'deepEqual': deepEqual,
    'deepStrictEqual': deepEqual,
    'doesNotMatch': doesNotMatch,
    'doesNotReject': async (input: (() => Promise<unknown>) | Promise<unknown>): Promise<void> => {
      const rejection = await settle(input);
      if (rejection !== undefined) {
        throw failure(undefined, `Got unwanted rejection: ${describeValue(rejection)}`);
      }
    },
    'doesNotThrow': (fn: () => unknown): void => { fn(); },
    'equal': equal,
    'fail': (message?: string | Error): never => { throw failure(message, 'Failed'); },
    'ifError': (value: unknown): void => {
      if (value !== undefined && value !== null) {
        throw value instanceof Error ? value : new Error(`ifError got unwanted exception: ${describeValue(value)}`);
      }
    },
    'match': assertMatch,
    'notDeepEqual': notDeepEqual,
    'notDeepStrictEqual': notDeepEqual,
    'notEqual': notEqual,
    'notStrictEqual': notEqual,
    'ok': assert,
    'rejects': rejects,
    'strictEqual': equal,
    'throws': throws
  });
}

function buildStaticModules(): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  // Node built-in shims
  const assertShim = makeAssertShim();
  out['node:assert'] = assertShim;
  out['node:assert/strict'] = assertShim;
  out['node:util'] = { 'isDeepStrictEqual': isDeepStrictEqual };
  out['node:timers/promises'] = makeTimersShim();
  out['node:crypto'] = { 'randomUUID': () => { return globalThis.crypto.randomUUID(); } };

  return out;
}

let fakerModulePromise: Promise<unknown> | undefined;

/**
 * Third-party npm packages aren't resolvable through the source glob or the
 * Node-builtin shims above — this registers `@faker-js/faker` as its own static
 * module the first time any example needs it, awaited before execution starts
 * so `require('@faker-js/faker')` resolves synchronously during the run.
 */
async function ensureFakerLoaded(): Promise<void> {
  if ('@faker-js/faker' in STATIC_MODULES) {
    return;
  }
  fakerModulePromise ??= import('@faker-js/faker');
  STATIC_MODULES['@faker-js/faker'] = await fakerModulePromise;
}

/** Canonicalize a relative `spec` against the directory of `fromCanonical`. */
function resolveRelative(spec: string, fromCanonical: string): string {
  const fromDir = fromCanonical.split('/').slice(0, -1);
  const parts = spec.replace(/\.js$/, '').replace(/\.ts$/, '').split('/');

  for (const part of parts) {
    if (part === '.' || part === '') {
      continue;
    }
    if (part === '..') {
      fromDir.pop();
    } else {
      fromDir.push(part);
    }
  }

  return fromDir.join('/');
}

function resolveModuleSpecifier(specifier: string, fromCanonical: string): string {
  if (specifier.startsWith('@studnicky/')) {
    return EXPORT_TARGETS.get(specifier) ?? specifier;
  }

  return specifier.startsWith('.')
    ? resolveRelative(specifier, fromCanonical)
    : specifier;
}

function resolveSourceCanonical(canonical: string): string | undefined {
  const browserCanonical = canonical.replace(
    /^(packages\/[^/]+\/src)\/index$/,
    (_match: string, prefix: string): string => { return `${prefix  }/browser/index`; }
  );

  if (browserCanonical in SOURCE_LOADERS) {
    return browserCanonical;
  }

  const rootCanonical = canonical.replace(
    /^(packages\/[^/]+\/src)\/browser\/index/,
    (_match: string, prefix: string): string => { return `${prefix  }/index`; }
  );

  if (rootCanonical in SOURCE_LOADERS) {
    return rootCanonical;
  }

  if (canonical in SOURCE_LOADERS) {
    return canonical;
  }

  const indexCanonical = `${canonical}/index`;

  if (indexCanonical in SOURCE_LOADERS) {
    return indexCanonical;
  }

  const nodeToBrowser = canonical.replace(/\/node\/index$/u, '/browser/index');
  return nodeToBrowser in SOURCE_LOADERS ? nodeToBrowser : undefined;
}

async function loadSourceModule(canonical: string): Promise<boolean> {
  const resolved = resolveSourceCanonical(canonical);

  if (resolved === undefined) {
    return false;
  }

  const loaded = STATIC_MODULES[resolved];

  if (loaded !== undefined) {
    STATIC_MODULES[canonical] = loaded;
    return true;
  }

  let pending = PENDING_MODULES.get(resolved);

  if (pending === undefined) {
    pending = SOURCE_LOADERS[resolved]();
    PENDING_MODULES.set(resolved, pending);
  }

  try {
    const moduleNamespace = await pending;
    STATIC_MODULES[resolved] = moduleNamespace;
    STATIC_MODULES[canonical] = moduleNamespace;
    return true;
  } finally {
    PENDING_MODULES.delete(resolved);
  }
}

let typescriptCompiler: typeof TypeScriptNamespace | undefined;

/** The compiler loads on the first Execute; transpilation is synchronous afterwards. */
async function ensureTypescriptLoaded(): Promise<typeof TypeScriptNamespace> {
  typescriptCompiler ??= await import('typescript');
  return typescriptCompiler;
}

/** `import.meta` has no meaning inside a CommonJS function body; it becomes the injected `__importMeta`. */
function importMetaTransformer(compiler: typeof TypeScriptNamespace): TypeScriptNamespace.TransformerFactory<TypeScriptNamespace.SourceFile> {
  return (context) => {
    const visit = (node: TypeScriptNamespace.Node): TypeScriptNamespace.Node => {
      return compiler.isMetaProperty(node) && node.keywordToken === compiler.SyntaxKind.ImportKeyword
        ? compiler.factory.createIdentifier('__importMeta')
        : compiler.visitEachChild(node, visit, context);
    };
    return (file) => { return compiler.visitNode(file, visit, compiler.isSourceFile) ?? file; };
  };
}

/** Single transpile path for the example under test and every example-tree module it imports. */
function transpile(source: string, canonical: string): string {
  if (typescriptCompiler === undefined) {
    throw new Error('The TypeScript compiler is not loaded');
  }
  const compiler = typescriptCompiler;
  return compiler.transpileModule(source, {
    'compilerOptions': {
      'esModuleInterop': true,
      'module': compiler.ModuleKind.CommonJS,
      'target': compiler.ScriptTarget.ES2022
    },
    'fileName': `${canonical}.ts`,
    'transformers': { 'before': [importMetaTransformer(compiler)] }
  }).outputText;
}

function makeImportMeta(canonical: string): { 'dirname': string; 'filename': string; 'url': string } {
  const filename = `/${canonical}.ts`;
  return { 'dirname': filename.split('/').slice(0, -1).join('/'), 'filename': filename, 'url': `file://${filename}` };
}

/** Macrotask scheduling: the browser equivalent of Node's setImmediate. */
function setImmediateShim(callback: (...args: unknown[]) => void, ...args: unknown[]): number {
  return globalThis.setTimeout(callback, 0, ...args);
}

function clearImmediateShim(handle: number): void {
  globalThis.clearTimeout(handle);
}

const FACTORY_PARAMETERS = ['require', 'exports', 'module', 'console', 'process', 'setImmediate', 'clearImmediate', '__importMeta'] as const;

function collectRequireSpecifiers(code: string): string[] {
  const specifiers = new Set<string>();
  const requirePattern = /require\(["']([^"']+)["']\)/g;

  for (const match of code.matchAll(requirePattern)) {
    const specifier = match[1];
    if (specifier !== undefined) {
      specifiers.add(specifier);
    }
  }

  return [...specifiers];
}

async function preloadDependencies(code: string, fromCanonical: string, visited: Set<string>): Promise<void> {
  const specifiers = collectRequireSpecifiers(code);

  await Promise.all(specifiers.map(async (specifier) => {
    const canonical = resolveModuleSpecifier(specifier, fromCanonical);

    if (canonical in STATIC_MODULES || await loadSourceModule(canonical)) {
      return;
    }

    if (visited.has(canonical)) {
      return;
    }
    visited.add(canonical);

    const rawSource = await ExampleSources.get(canonical);

    if (rawSource !== undefined) {
      await preloadDependencies(transpile(rawSource, canonical), canonical, visited);
    }
  }));
}

interface LoadedModuleInterface {
  'exports': Record<string, unknown>;
}

const moduleCache = new Map<string, LoadedModuleInterface>();
const silentConsole: Console = { ...console, 'debug': function() {}, 'error': function() {}, 'info': function() {}, 'log': function() {}, 'warn': function() {} };

const processEnvironment: Record<string, string> = {};
const processShim = { 'cwd': () => { return '/'; }, 'env': processEnvironment, 'platform': 'browser' };

function evaluate(source: string, canonical: string, runtimeConsole: Console): Record<string, unknown> {
  const code = transpile(source, canonical);
  const moduleObject: LoadedModuleInterface = { 'exports': {} };
  const requireShim = makeRequire(canonical);

  // new Function is the playground's mechanism for evaluating transpiled CJS source
  // with an injected require shim. This is the runner's entire purpose
  // and cannot be replaced with a static import.
  const factory = new Function(...FACTORY_PARAMETERS, code);

  factory(requireShim, moduleObject.exports, moduleObject, runtimeConsole, processShim, setImmediateShim, clearImmediateShim, makeImportMeta(canonical));

  return moduleObject.exports;
}

function makeRequire(fromCanonical: string): (specifier: string) => unknown {
  return (specifier: string): unknown => {
    if (specifier in STATIC_MODULES) {
      return STATIC_MODULES[specifier];
    }

    const canonical = resolveModuleSpecifier(specifier, fromCanonical);

    if (canonical in STATIC_MODULES) {
      return STATIC_MODULES[canonical];
    }

    const cached = moduleCache.get(canonical);

    if (cached !== undefined) {
      return cached.exports;
    }

    const source = ExampleSources.getLoaded(canonical);

    if (source === undefined) {
      throw new Error(`Cannot resolve import '${specifier}' (resolved to '${canonical}') in the playground`);
    }

    // Reserve the cache slot before evaluating to tolerate import cycles.
    const slot: LoadedModuleInterface = { 'exports': {} };
    moduleCache.set(canonical, slot);

    // Dependency module bodies run with a silent console so only the example
    // under test produces visible output.
    slot.exports = evaluate(source, canonical, silentConsole);

    return slot.exports;
  };
}

/**
 * Transpile and execute an example's (edited) source in the browser.
 * `path` is the repo-rooted example path without extension
 * (e.g. 'packages/retry/examples/basicRetry').
 * `runtimeConsole` captures the example's output.
 */
export async function runExample(source: string, path: string, runtimeConsole: Console): Promise<void> {
  await ensureTypescriptLoaded();
  const code = transpile(source, path);

  if (collectRequireSpecifiers(code).includes('@faker-js/faker')) {
    await ensureFakerLoaded();
  }

  await preloadDependencies(code, path, new Set<string>());
  const requireShim = makeRequire(path);
  const moduleObject: LoadedModuleInterface = { 'exports': {} };

  // new Function executes user-edited example source (transpiled CJS) with an
  // injected require shim. Running arbitrary TS examples is the playground's purpose.
  const factory = new Function(...FACTORY_PARAMETERS, `return (async () => {\n${code}\n})();`);

  await factory(requireShim, moduleObject.exports, moduleObject, runtimeConsole, processShim, setImmediateShim, clearImmediateShim, makeImportMeta(path));
}
