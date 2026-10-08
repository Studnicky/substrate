/**
 * A minimal `node:test`-compatible test registry that runs inside a real
 * browser page. The browser-condition spec files under each package's tests
 * directory import `describe`/`it`/`mock` from `node:test` and `assert` from
 * `node:assert/strict` — Node builtins with no browser equivalent. The
 * browser test bundler (`scripts/test-browser.ts`) aliases those two
 * specifiers to this module and `BrowserAssertStrict.ts`, so the spec files
 * run unmodified in Chromium, Firefox, and WebKit.
 *
 * Supports exactly what the ported spec files use: synchronous and async
 * test bodies, one level of `describe` nesting, and serial execution in
 * registration order. It does not implement `test.only`, concurrency, or
 * `before`/`after` hooks — none of the ported files use them.
 */

export interface BrowserTestFailureInterface {
  readonly 'error': unknown;
  readonly 'name': string;
}

export interface BrowserTestSummaryInterface {
  readonly 'failures': readonly BrowserTestFailureInterface[];
  readonly 'passed': number;
  readonly 'total': number;
}

interface RegisteredTestInterface {
  readonly 'name': string;
  readonly 'run': () => unknown;
}

const registeredTests: RegisteredTestInterface[] = [];
let describePrefix = '';

export function describe(name: string, run: () => void): void {
  const previousPrefix = describePrefix;
  describePrefix = previousPrefix === '' ? name : `${previousPrefix} > ${name}`;
  try {
    run();
  } finally {
    describePrefix = previousPrefix;
  }
}

export function it(name: string, run: () => unknown): void {
  const qualifiedName = describePrefix === '' ? name : `${describePrefix} > ${name}`;
  registeredTests.push({ 'name': qualifiedName, 'run': run });
}

interface MockGetterHandleInterface {
  readonly 'mock': { readonly 'restore': () => void };
}

export const mock = {
  'getter': function getter<TTarget extends object, TKey extends keyof TTarget>(
    target: TTarget,
    key: TKey,
    implementation: () => TTarget[TKey]
  ): MockGetterHandleInterface {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    Object.defineProperty(target, key, { 'configurable': true, 'get': implementation });

    return {
      'mock': {
        'restore': (): void => {
          if (descriptor === undefined) {
            Reflect.deleteProperty(target, key);
            return;
          }
          Object.defineProperty(target, key, descriptor);
        }
      }
    };
  }
};

/** Runs every registered test serially and returns a summary. Call once, after all `describe`/`it` registration has executed. */
export async function runRegisteredTests(): Promise<BrowserTestSummaryInterface> {
  const failures: BrowserTestFailureInterface[] = [];
  let passed = 0;

  for (const test of registeredTests) {
    try {
      await test.run();
      passed += 1;
    } catch (error) {
      failures.push({ 'error': error, 'name': test.name });
    }
  }

  return { 'failures': failures, 'passed': passed, 'total': registeredTests.length };
}
