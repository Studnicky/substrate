/**
 * A browser-safe stand-in for `node:assert/strict`, covering exactly the
 * methods the ported browser-condition spec files call: `equal`, `notEqual`,
 * `deepEqual`, `ok`, and `throws`. See `BrowserTestRunner.ts` for how this
 * module is wired in.
 */

class BrowserAssertionError extends Error {
  public override readonly name: string = 'AssertionError';

  public constructor(message: string) {
    super(message);
  }
}

function equal(actual: unknown, expected: unknown, message?: string): void {
  if (actual !== expected) {
    throw new BrowserAssertionError(message ?? `Expected ${String(actual)} to equal ${String(expected)}`);
  }
}

function notEqual(actual: unknown, expected: unknown, message?: string): void {
  if (actual === expected) {
    throw new BrowserAssertionError(message ?? `Expected ${String(actual)} to not equal ${String(expected)}`);
  }
}

function deepEqual(actual: unknown, expected: unknown, message?: string): void {
  const matches = deepValuesEqual(actual, expected);
  if (!matches) {
    throw new BrowserAssertionError(message ?? `Expected ${JSON.stringify(actual)} to deep-equal ${JSON.stringify(expected)}`);
  }
}

function deepValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  const bothArrays = Array.isArray(left) && Array.isArray(right);
  if (bothArrays) {
    const leftArray = left as readonly unknown[];
    const rightArray = right as readonly unknown[];
    const sameLength = leftArray.length === rightArray.length;
    return sameLength && leftArray.every((entry, index) => { return deepValuesEqual(entry, rightArray[index]); });
  }
  const bothRecords = typeof left === 'object' && left !== null && typeof right === 'object' && right !== null;
  if (bothRecords) {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord).toSorted();
    const rightKeys = Object.keys(rightRecord).toSorted();
    const sameKeys = JSON.stringify(leftKeys) === JSON.stringify(rightKeys);
    return sameKeys && leftKeys.every((key) => { return deepValuesEqual(leftRecord[key], rightRecord[key]); });
  }
  return false;
}

function ok(value: unknown, message?: string): void {
  const isTruthy = Boolean(value);
  if (isTruthy === false) {
    throw new BrowserAssertionError(message ?? `Expected ${String(value)} to be truthy`);
  }
}

/** A constructor has an own, non-null `prototype` object; a validator callback (including an arrow function) does not. */
function looksLikeConstructor(candidate: (...args: readonly unknown[]) => unknown): boolean {
  const prototype: unknown = Reflect.get(candidate, 'prototype');
  return typeof prototype === 'object' && prototype !== null;
}

function throws(run: () => unknown, expected?: unknown, message?: string): void {
  let didThrow = false;
  let caught: unknown;
  try {
    run();
  } catch (error) {
    didThrow = true;
    caught = error;
  }
  if (!didThrow) {
    throw new BrowserAssertionError(message ?? 'Expected function to throw');
  }
  if (typeof expected !== 'function') {
    return;
  }
  if (looksLikeConstructor(expected as (...args: readonly unknown[]) => unknown)) {
    if (!(caught instanceof expected)) {
      throw new BrowserAssertionError(message ?? `Expected thrown value to be an instance of ${expected.name}`);
    }
    return;
  }
  const validator = expected as (error: unknown) => unknown;
  const validatorResult = Boolean(validator(caught));
  if (validatorResult === false) {
    throw new BrowserAssertionError(message ?? 'Expected thrown value to satisfy the validator function');
  }
}

const assertStrict = { 'deepEqual': deepEqual, 'equal': equal, 'notEqual': notEqual, 'ok': ok, 'throws': throws };

// eslint-disable-next-line import-x/no-default-export -- aliases `node:assert/strict`, whose spec-file callers use `import assert from 'node:assert/strict'`; the default export is the external contract being impersonated, not a choice made here.
export default assertStrict;
