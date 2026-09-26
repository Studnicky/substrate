import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EntityCompiler as BrowserEntityCompiler } from '../../../src/browser/index.js';
import { EntityCompiler as NodeEntityCompiler } from '../../../src/node/index.js';
import { SchemaIntakeError } from '../../../src/SchemaIntakeError.js';

const SCHEMA = {
  '$id': 'https://studnicky.dev/schemas/entity-compiler-browser-csp',
  'additionalProperties': false,
  'properties': {
    'host': { 'default': 'localhost', 'type': 'string' },
    'port': { 'type': 'integer' },
    'region': { 'type': 'string' }
  },
  'required': ['port'],
  'type': 'object'
} as const;

/** Counts `Function`/`new Function` constructions during `run`, restoring the real constructor afterward. */
function countDynamicCodeConstructions(run: () => void): number {
  const RealFunction = globalThis.Function;
  let constructions = 0;
  const trappedFunction = new Proxy(RealFunction, {
    'apply'(target, thisArgument, argumentsList: unknown[]) {
      constructions += 1;
      return Reflect.apply(target, thisArgument, argumentsList);
    },
    'construct'(target, argumentsList: unknown[], newTarget) {
      constructions += 1;
      return Reflect.construct(target, argumentsList, newTarget);
    }
  });
  globalThis.Function = trappedFunction;
  try {
    run();
  } finally {
    globalThis.Function = RealFunction;
  }
  return constructions;
}

void describe('EntityCompiler browser CSP safety', () => {
  void it('compiles and validates through the browser path without constructing dynamic code', () => {
    const constructions = countDynamicCodeConstructions(() => {
      const validate = BrowserEntityCompiler.compile<{ host: string; port: number }>(SCHEMA);
      validate({ 'host': 'localhost', 'port': 8080 });
      validate({ 'port': 'not-a-number' });
    });

    assert.equal(constructions, 0);
  });

  void it('compiles and validates through the node path without constructing dynamic code', () => {
    const constructions = countDynamicCodeConstructions(() => {
      const validate = NodeEntityCompiler.compile<{ host: string; port: number }>(SCHEMA);
      validate({ 'host': 'localhost', 'port': 8080 });
      validate({ 'port': 'not-a-number' });
    });

    assert.equal(constructions, 0);
  });

  void it('rejects the same payload the node path rejects, with the same error shape', () => {
    const browserValidate = BrowserEntityCompiler.compile<{ port: number }>(SCHEMA);
    const nodeValidate = NodeEntityCompiler.compile<{ port: number }>(SCHEMA);
    const valid = { 'host': 'db.internal', 'port': 5432 };
    const invalid = { 'host': 'db.internal', 'port': 'five-four-three-two' };

    assert.equal(browserValidate(valid), true);
    assert.equal(nodeValidate(valid), true);

    assert.equal(browserValidate(invalid), false);
    assert.equal(nodeValidate(invalid), false);
    const browserError = browserValidate.errors?.[0];
    const nodeError = nodeValidate.errors?.[0];
    assert.ok(browserError !== undefined);
    assert.ok(nodeError !== undefined);
    assert.equal(browserError.keyword, nodeError.keyword);
    assert.equal(browserError.instancePath, nodeError.instancePath);
  });

  void it('fills defaults and reports a missing required property the same way as the node path', () => {
    const browserIntake = BrowserEntityCompiler.compileIntake<{ host: string; port: number }>(SCHEMA);
    const nodeIntake = NodeEntityCompiler.compileIntake<{ host: string; port: number }>(SCHEMA);
    const input = { 'port': 8080 };

    assert.deepEqual(browserIntake(input), { 'host': 'localhost', 'port': 8080 });
    assert.deepEqual(input, { 'port': 8080 });
    assert.deepEqual(nodeIntake({ 'port': 8080 }), { 'host': 'localhost', 'port': 8080 });

    let browserMissingProperty: unknown;
    try {
      browserIntake({});
      assert.fail('Expected missing required property to throw');
    } catch (error) {
      if (!(error instanceof SchemaIntakeError)) {
        throw error;
      }
      browserMissingProperty = error.errors[0]?.parameters.missingProperty;
    }

    let nodeMissingProperty: unknown;
    try {
      nodeIntake({});
      assert.fail('Expected missing required property to throw');
    } catch (error) {
      if (!(error instanceof SchemaIntakeError)) {
        throw error;
      }
      nodeMissingProperty = error.errors[0]?.parameters.missingProperty;
    }

    assert.equal(browserMissingProperty, 'port');
    assert.equal(browserMissingProperty, nodeMissingProperty);
  });
});
