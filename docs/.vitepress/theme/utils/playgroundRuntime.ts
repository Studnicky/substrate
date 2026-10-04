// In-browser evaluator for build-time-compiled playground payloads.

import { loadPlaygroundPayload, loadPlaygroundSource } from './generated/playgroundPayloads';
import { isDeepStrictEqual } from './NodeUtilShim';

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

function makeAssertShim(): AssertShimInterface {
  const equal = (a: unknown, b: unknown, message?: string | Error): void => {
    if (Object.is(a, b) === false) {
      throw failure(message, `Expected values to be strictly equal:\n  ${describeValue(a)}\n  ${describeValue(b)}`);
    }
  };
  const notEqual = (a: unknown, b: unknown, message?: string | Error): void => {
    if (Object.is(a, b)) {
      throw failure(message, `Expected "actual" to be strictly unequal to: ${describeValue(b)}`);
    }
  };
  const deepEqual = (a: unknown, b: unknown, message?: string | Error): void => {
    if (isDeepStrictEqual(a, b) === false) {
      throw failure(message, `Expected values to be strictly deep-equal:\n  ${describeValue(a)}\n  ${describeValue(b)}`);
    }
  };
  const notDeepEqual = (a: unknown, b: unknown, message?: string | Error): void => {
    if (isDeepStrictEqual(a, b)) {
      throw failure(message, `Expected "actual" not to be strictly deep-equal to: ${describeValue(b)}`);
    }
  };
  const throws = (fn: () => unknown, expected?: unknown, message?: string | Error): void => {
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
  };
  const rejects = async (input: (() => Promise<unknown>) | Promise<unknown>, expected?: unknown, message?: string | Error): Promise<void> => {
    const rejection = await settle(input);
    if (rejection === undefined) {
      throw failure(typeof expected === 'string' ? expected : message, 'Missing expected rejection.');
    }
    if (matchesExpectation(rejection, typeof expected === 'string' ? undefined : expected) === false) {
      throw failure(message, `The rejection does not satisfy the expectation: ${describeValue(rejection)}`);
    }
  };
  const match = (value: string, pattern: RegExp, message?: string | Error): void => {
    if (pattern.test(value) === false) {
      throw failure(message, `The input did not match the regular expression ${String(pattern)}: ${describeValue(value)}`);
    }
  };
  const doesNotMatch = (value: string, pattern: RegExp, message?: string | Error): void => {
    if (pattern.test(value)) {
      throw failure(message, `The input was expected to not match ${String(pattern)}: ${describeValue(value)}`);
    }
  };

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
    'match': match,
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

const STATIC_MODULES: Record<string, unknown> = buildStaticModules();

interface LoadedModuleInterface {
  'exports': Record<string, unknown>;
}

let loadedModuleCodes: Readonly<Record<string, string>> = {};
let moduleAliases: Readonly<Record<string, string>> = {};
let moduleCache = new Map<string, LoadedModuleInterface>();
const silentConsole: Console = { ...console, 'debug': function() {}, 'error': function() {}, 'info': function() {}, 'log': function() {}, 'warn': function() {} };
const processEnvironment: Record<string, string> = {};
const processShim = { 'cwd': () => { return '/'; }, 'env': processEnvironment, 'platform': 'browser' };
const FACTORY_PARAMETERS = ['require', 'exports', 'module', 'console', 'process', 'setImmediate', 'clearImmediate', '__importMeta'] as const;

function resolveRelative(specifier: string, fromCanonical: string): string {
  const parts = fromCanonical.split('/').slice(0, -1);
  for (const part of specifier.replace(/\.(?:js|ts)$/u, '').split('/')) {
    if (part === '' || part === '.') { continue; }
    if (part === '..') { parts.pop(); } else { parts.push(part); }
  }
  return parts.join('/');
}

function resolveModuleSpecifier(specifier: string, fromCanonical: string): string {
  if (specifier.startsWith('@studnicky/')) { return moduleAliases[specifier] ?? specifier; }
  return specifier.startsWith('.') ? resolveRelative(specifier, fromCanonical) : specifier;
}

function makeImportMeta(canonical: string): { 'dirname': string; 'filename': string; 'url': string } {
  const filename = `/${canonical}.ts`;
  return { 'dirname': filename.split('/').slice(0, -1).join('/'), 'filename': filename, 'url': `file://${filename}` };
}

function setImmediateShim(callback: (...args: unknown[]) => void, ...args: unknown[]): ReturnType<typeof globalThis.setTimeout> {
  return globalThis.setTimeout(callback, 0, ...args);
}

function clearImmediateShim(handle: ReturnType<typeof globalThis.setTimeout>): void { globalThis.clearTimeout(handle); }

function makeRequire(fromCanonical: string): (specifier: string) => unknown {
  return (specifier: string): unknown => {
    if (specifier in STATIC_MODULES) { return STATIC_MODULES[specifier]; }
    const canonical = resolveModuleSpecifier(specifier, fromCanonical);
    if (canonical in STATIC_MODULES) { return STATIC_MODULES[canonical]; }
    const cached = moduleCache.get(canonical);
    if (cached !== undefined) { return cached.exports; }
    const code = loadedModuleCodes[canonical];
    if (code === undefined) { throw new Error(`Cannot resolve import '${specifier}' (resolved to '${canonical}') in the playground`); }
    const slot: LoadedModuleInterface = { 'exports': {} };
    moduleCache.set(canonical, slot);
    const factory = new Function(...FACTORY_PARAMETERS, code);
    factory(makeRequire(canonical), slot.exports, slot, silentConsole, processShim, setImmediateShim, clearImmediateShim, makeImportMeta(canonical));
    return slot.exports;
  };
}

/** Returns registered source without placing TypeScript or raw-source globs in the client graph. */
export function getExampleSource(path: string): Promise<string> {
  return loadPlaygroundSource(path);
}

/** Executes the selected build-time-compiled payload with its preloaded module closure. */
export async function runExample(_source: string, path: string, runtimeConsole: Console): Promise<void> {
  const payload = await loadPlaygroundPayload(path);
  loadedModuleCodes = payload.modules;
  moduleAliases = payload.aliases;
  moduleCache = new Map<string, LoadedModuleInterface>();
  const code = payload.modules[path];
  if (code === undefined) { throw new Error(`Missing compiled playground entry: ${path}`); }
  const moduleObject: LoadedModuleInterface = { 'exports': {} };
  const factory = new Function(...FACTORY_PARAMETERS, `return (async () => {\n${code}\n})();`);
  await factory(makeRequire(path), moduleObject.exports, moduleObject, runtimeConsole, processShim, setImmediateShim, clearImmediateShim, makeImportMeta(path));
}
