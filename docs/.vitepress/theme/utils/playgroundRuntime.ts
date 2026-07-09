// In-browser module loader for runnable examples.
//
// An example is a real .ts file in packages/*/examples/. To execute its (possibly
// edited) source in the browser we must resolve its imports. Imports fall into
// two worlds:
//
//   1. Package sources (packages/*/src/index.ts) — imported STATICALLY here via
//      an eager glob so Vite bundles them optimally.
//   2. Example-tree modules — loaded LAZILY from their raw source via a tiny
//      CommonJS evaluator, memoized so only modules an example actually imports
//      are evaluated, and side-effectful module bodies run at most once.
//
// `runExample` transpiles the example's editor text with sucrase and executes
// it with a `require` shim bound to the example's path.

import { transform } from 'sucrase';

// Eager glob of all browser-compatible package sources — Vite compiles these.
// Keys are relative to this file (docs/.vitepress/theme/utils/), e.g.:
//   '../../../../packages/retry/src/index.ts'
//
// Packages excluded from the source glob (Node-only — cannot bundle for browser):
//   context      — uses node:async_hooks (AsyncLocalStorage); cross-await
//                  propagation has no faithful browser equivalent
//   eslint-config — Node dev tool; pulls in typescript-eslint, unrs-resolver
//   worker-pool  — uses node:worker_threads directly; no browser equivalent
//
// system, file-lock, and fetch are isomorphic: their Node-only internals are
// swapped for browser siblings by the `substrate-browser-swap` Vite plugin (see
// docs/.vitepress/config.ts), so they ARE included here. (fetch runs over the
// browser's native `fetch`; the undici connection-pool dispatcher is the
// swapped Node-only enhancement.)
const SOURCE_GLOB = import.meta.glob(
  [
    '../../../../packages/*/src/index.ts',
    '!../../../../packages/context/src/index.ts',
    '!../../../../packages/eslint-config/src/index.ts',
    '!../../../../packages/worker-pool/src/index.ts'
  ],
  { eager: true }
) as Record<string, Record<string, unknown>>;

// Raw source of every example file, keyed the same way.
// Examples from excluded packages are also excluded.
const RAW_GLOB = import.meta.glob(
  [
    '../../../../packages/*/examples/**/*.ts',
    '!../../../../packages/context/examples/**/*.ts',
    '!../../../../packages/eslint-config/examples/**/*.ts',
    '!../../../../packages/worker-pool/examples/**/*.ts'
  ],
  { query: '?raw', import: 'default', eager: true }
) as Record<string, string>;

/** Raw source of every example module, keyed by extension-less canonical path. */
const RAW_SOURCES = buildRawSources();

/** Canonical path → statically-bundled module namespace. */
const STATIC_MODULES: Readonly<Record<string, unknown>> = buildStaticModules();

interface TimerOptionsInterface {
  signal?: AbortSignal;
}

function makeTimersShim(): Record<string, unknown> {
  return {
    setTimeout: (ms: number, value?: unknown, opts?: TimerOptionsInterface): Promise<unknown> => {
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

function makeAssertShim(): unknown {
  function assert(value: unknown, message?: string | Error): void {
    if (value !== true && !value) {
      throw new Error(message instanceof Error ? message.message : (message ?? 'Assertion failed'));
    }
  }

  assert.ok = assert;

  assert.equal = (a: unknown, b: unknown, msg?: string | Error): void => {
    if (a !== b) {
      throw new Error(msg instanceof Error ? msg.message : (msg ?? `Expected ${String(a)} === ${String(b)}`));
    }
  };

  assert.strictEqual = (a: unknown, b: unknown, msg?: string | Error): void => {
    if (a !== b) {
      throw new Error(msg instanceof Error ? msg.message : (msg ?? `Expected ${String(a)} === ${String(b)}`));
    }
  };

  assert.notEqual = (a: unknown, b: unknown, msg?: string | Error): void => {
    if (a === b) {
      throw new Error(msg instanceof Error ? msg.message : (msg ?? `Expected ${String(a)} !== ${String(b)}`));
    }
  };

  assert.notStrictEqual = (a: unknown, b: unknown, msg?: string | Error): void => {
    if (a === b) {
      throw new Error(msg instanceof Error ? msg.message : (msg ?? `${String(a)} should not strictly equal ${String(b)}`));
    }
  };

  assert.deepEqual = (a: unknown, b: unknown, msg?: string | Error): void => {
    const as = JSON.stringify(a);
    const bs = JSON.stringify(b);
    if (as !== bs) {
      throw new Error(msg instanceof Error ? msg.message : (msg ?? `Deep equal failed:\n  ${as}\n  ${bs}`));
    }
  };

  assert.deepStrictEqual = assert.deepEqual;

  assert.throws = (fn: () => unknown, _expected?: unknown, msg?: string): void => {
    try {
      fn();
    } catch {
      return;
    }
    throw new Error(typeof msg === 'string' ? msg : 'Missing expected exception');
  };

  assert.doesNotThrow = (fn: () => unknown): void => {
    fn();
  };

  assert.rejects = async (input: (() => Promise<unknown>) | Promise<unknown>, _expected?: unknown, msg?: string): Promise<void> => {
    try {
      await (typeof input === 'function' ? input() : input);
    } catch {
      return;
    }
    throw new Error(typeof msg === 'string' ? msg : 'Missing expected rejection');
  };

  assert.doesNotReject = async (input: (() => Promise<unknown>) | Promise<unknown>): Promise<void> => {
    await (typeof input === 'function' ? input() : input);
  };

  return assert;
}

function buildStaticModules(): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, mod] of Object.entries(SOURCE_GLOB)) {
    // key: '../../../../packages/retry/src/index.ts'
    // canonical: 'packages/retry/src/index'
    const canonical = key.replace(/^(\.\.\/)+/, '').replace(/\.ts$/, '');
    out[canonical] = mod;
  }

  // Node built-in shims
  const assertShim = makeAssertShim();
  out['node:assert'] = assertShim;
  out['node:assert/strict'] = assertShim;
  out['node:timers/promises'] = makeTimersShim();
  out['node:crypto'] = { randomUUID: () => { return globalThis.crypto.randomUUID(); } };

  return out;
}

function buildRawSources(): Record<string, string> {
  const out: Record<string, string> = {};

  for (const [key, source] of Object.entries(RAW_GLOB)) {
    // key: '../../../../packages/retry/examples/basicRetry.ts'
    // canonical: 'packages/retry/examples/basicRetry'
    const canonical = key.replace(/^(\.\.\/)+/, '').replace(/\.ts$/, '');
    out[canonical] = source;
  }

  return out;
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

function lookupRaw(canonical: string): string | undefined {
  return RAW_SOURCES[canonical] ?? RAW_SOURCES[`${canonical}/index`];
}

interface LoadedModuleInterface {
  exports: Record<string, unknown>;
}

const moduleCache = new Map<string, LoadedModuleInterface>();
const silentConsole = { ...console, debug() {}, error() {}, info() {}, log() {}, warn() {} } as Console;

const processShim = { cwd: () => { return '/'; }, env: {} as Record<string, string>, platform: 'browser' };

function evaluate(source: string, canonical: string, runtimeConsole: Console): Record<string, unknown> {
  const { code } = transform(source, { filePath: `${canonical}.ts`, transforms: ['imports', 'typescript'] });
  const moduleObject: LoadedModuleInterface = { exports: {} };
  const requireShim = makeRequire(canonical, runtimeConsole);

  // new Function is the playground's mechanism for evaluating sucrase-transpiled
  // CJS source with an injected require shim. This is the runner's entire purpose
  // and cannot be replaced with a static import.
  const factory = new Function(
    'require', 'exports', 'module', 'console', 'process',
    code
  ) as (
    require: (specifier: string) => unknown,
    exports: Record<string, unknown>,
    module: LoadedModuleInterface,
    console: Console,
    process: typeof processShim
  ) => void;

  factory(requireShim, moduleObject.exports, moduleObject, runtimeConsole, processShim);

  return moduleObject.exports;
}

function makeRequire(fromCanonical: string, runtimeConsole: Console): (specifier: string) => unknown {
  return (specifier: string): unknown => {
    if (specifier in STATIC_MODULES) {
      return STATIC_MODULES[specifier];
    }

    const canonical = specifier.startsWith('.')
      ? resolveRelative(specifier, fromCanonical)
      : specifier;

    if (canonical in STATIC_MODULES) {
      return STATIC_MODULES[canonical];
    }

    const cached = moduleCache.get(canonical);

    if (cached !== undefined) {
      return cached.exports;
    }

    const source = lookupRaw(canonical);

    if (source === undefined) {
      throw new Error(`Cannot resolve import '${specifier}' (resolved to '${canonical}') in the playground`);
    }

    // Reserve the cache slot before evaluating to tolerate import cycles.
    const slot: LoadedModuleInterface = { exports: {} };
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
  const { code } = transform(source, { filePath: `${path}.ts`, transforms: ['imports', 'typescript'] });
  const requireShim = makeRequire(path, runtimeConsole);
  const moduleObject: LoadedModuleInterface = { exports: {} };

  // new Function executes user-edited example source (CJS from sucrase) with an
  // injected require shim. Running arbitrary TS examples is the playground's purpose.
  const factory = new Function(
    'require', 'exports', 'module', 'console', 'process',
    `return (async () => {\n${code}\n})();`
  ) as (
    require: (specifier: string) => unknown,
    exports: Record<string, unknown>,
    module: LoadedModuleInterface,
    console: Console,
    process: typeof processShim
  ) => Promise<void>;

  await factory(requireShim, moduleObject.exports, moduleObject, runtimeConsole, processShim);
}

/**
 * The verbatim source of an example by its repo-rooted, extension-less path
 * (e.g. 'packages/retry/examples/basicRetry'), or undefined if unknown.
 * This is the single source of truth shown in the editor and run on Execute.
 */
export function getExampleSource(path: string): string | undefined {
  return lookupRaw(path);
}
